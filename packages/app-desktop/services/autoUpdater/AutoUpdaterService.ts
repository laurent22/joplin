import { BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import path = require('path');
import Logger, { LoggerWrapper } from '@joplin/utils/Logger';
import type ShimType from '@joplin/lib/shim';
const shim: typeof ShimType = require('@joplin/lib/shim').default;
import { GitHubRelease, GitHubReleaseAsset } from '../../utils/checkForUpdatesUtils';
import * as semver from 'semver';

export enum AutoUpdaterEvents {
	CheckingForUpdate = 'checking-for-update',
	UpdateAvailable = 'update-available',
	UpdateNotAvailable = 'update-not-available',
	Error = 'error',
	DownloadProgress = 'download-progress',
	UpdateDownloaded = 'update-downloaded',
}

export const defaultUpdateInterval = 12 * 60 * 60 * 1000;
export const initialUpdateStartup = 5 * 1000;
const releasesLink = 'https://objects.joplinusercontent.com/r/releases';
export type Architecture = typeof process.arch;
interface PlatformAssets {
	[platform: string]: {
		[arch in Architecture]?: string;
	};
}
const supportedPlatformAssets: PlatformAssets = {
	'darwin': {
		'x64': 'latest-mac.yml',
		'arm64': 'latest-mac-arm64.yml',
	},
	'win32': {
		'x64': 'latest.yml',
		'ia32': 'latest.yml',
	},
};

export interface AutoUpdaterServiceInterface {
	checkForUpdates(isManualCheck: boolean): void;
	updateApp(): void;
	fetchLatestRelease(includePreReleases: boolean): Promise<GitHubRelease>;
	getDownloadUrlForPlatform(release: GitHubRelease, platform: string, arch: string): string;
}

export default class AutoUpdaterService implements AutoUpdaterServiceInterface {
	private window_: BrowserWindow;
	private logger_: LoggerWrapper;
	private devMode_: boolean;
	private enableDevMode = true; // force the updater to work in "dev" mode
	private enableAutoDownload = true; // automatically download an update when it is found
	private autoInstallOnAppQuit = false; // automatically install the downloaded update once the user closes the application
	private includePreReleases_ = false;
	private allowDowngrade = false;
	private isManualCheckInProgress = false;

	public constructor(mainWindow: BrowserWindow, logger: LoggerWrapper, devMode: boolean, includePreReleases: boolean) {
		this.window_ = mainWindow;
		this.logger_ = logger;
		this.devMode_ = devMode;
		this.includePreReleases_ = includePreReleases;
		this.configureAutoUpdater();
	}

	public checkForUpdates = async (isManualCheck = false): Promise<void> => {
		try {
			this.isManualCheckInProgress = isManualCheck;
			await this.checkForLatestRelease();
		} catch (error) {
			this.logger_.error('Failed to check for updates:', error);
			if (error.message.includes('ERR_CONNECTION_REFUSED')) {
				this.logger_.info('Server is not reachable. Will try again later.');
			}
		}
	};

	public updateApp = (): void => {
		autoUpdater.quitAndInstall(false, true);
	};

	public fetchLatestRelease = async (includePreReleases: boolean): Promise<GitHubRelease> => {
		const releases = await this.fetchReleases(includePreReleases);
		const release = releases[0];

		if (!release) {
			throw new Error('No suitable release found');
		}

		return release;
	};


	public getDownloadUrlForPlatform(release: GitHubRelease, platform: string, arch: string): string {
		if (!supportedPlatformAssets[platform]) {
			throw new Error(`The AutoUpdaterService does not support the following platform: ${platform}`);
		}

		const platformAssets = supportedPlatformAssets[platform];
		const assetName: string | undefined = platformAssets ? platformAssets[arch as Architecture] : undefined;
		if (!assetName) {
			throw new Error(`The AutoUpdaterService does not support the architecture: ${arch} for platform: ${platform}`);
		}

		const asset: GitHubReleaseAsset = release.assets.find(a => a.name === assetName);
		if (!asset) {
			throw new Error(`Yml file: ${assetName} not found for version: ${release.tag_name} platform: ${platform} and architecture: ${arch}`);
		}

		return asset.browser_download_url;
	}

	private fetchReleases = async (includePreReleases: boolean): Promise<GitHubRelease[]> => {
		const response = await fetch(releasesLink);

		if (!response.ok) {
			const responseText = await response.text();
			throw new Error(`Cannot get latest release info: ${responseText.substr(0, 500)}`);
		}

		const releases: GitHubRelease[] = await response.json();
		const sortedReleasesByVersion = releases.sort((a, b) => semver.rcompare(a.tag_name, b.tag_name));
		const filteredReleases = sortedReleasesByVersion.filter(release => includePreReleases || !release.prerelease);

		return filteredReleases;
	};

	private checkForLatestRelease = async (): Promise<void> => {
		try {
			const release: GitHubRelease = await this.fetchLatestRelease(this.includePreReleases_);

			try {
				let assetUrl = this.getDownloadUrlForPlatform(release, shim.platformName(), process.arch);
				// electron's autoUpdater appends automatically the platform's yml file to the link so we should remove it
				assetUrl = assetUrl.substring(0, assetUrl.lastIndexOf('/'));
				autoUpdater.setFeedURL({ provider: 'generic', url: assetUrl });
				await autoUpdater.checkForUpdates();
				this.isManualCheckInProgress = false;
			} catch (error) {
				this.logger_.error(`Update download url failed: ${error.message}`);
			}

		} catch (error) {
			this.logger_.error(`Fetching releases failed:  ${error.message}`);
		}
	};

	private configureAutoUpdater = (): void => {
		autoUpdater.logger = (this.logger_) as Logger;
		if (this.devMode_) {
			this.logger_.info('Development mode: using dev-app-update.yml');
			autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
			autoUpdater.forceDevUpdateConfig = this.enableDevMode;
		}

		autoUpdater.autoDownload = this.enableAutoDownload;
		autoUpdater.autoInstallOnAppQuit = this.autoInstallOnAppQuit;
		autoUpdater.allowPrerelease = this.includePreReleases_;
		autoUpdater.allowDowngrade = this.allowDowngrade;

		autoUpdater.on(AutoUpdaterEvents.CheckingForUpdate, this.onCheckingForUpdate);
		autoUpdater.on(AutoUpdaterEvents.UpdateNotAvailable, this.onUpdateNotAvailable);
		autoUpdater.on(AutoUpdaterEvents.UpdateAvailable, this.onUpdateAvailable);
		autoUpdater.on(AutoUpdaterEvents.DownloadProgress, this.onDownloadProgress);
		autoUpdater.on(AutoUpdaterEvents.UpdateDownloaded, this.onUpdateDownloaded);
		autoUpdater.on(AutoUpdaterEvents.Error, this.onError);
	};

	private onCheckingForUpdate = () => {
		this.logger_.info('Checking for update...');
	};

	private onUpdateNotAvailable = (_info: UpdateInfo): void => {
		if (this.isManualCheckInProgress) {
			this.window_.webContents.send(AutoUpdaterEvents.UpdateNotAvailable);
		}

		this.logger_.info('Update not available.');
	};

	private onUpdateAvailable = (info: UpdateInfo): void => {
		this.logger_.info(`Update available: ${info.version}.`);
	};

	private onDownloadProgress = (progressObj: { bytesPerSecond: number; percent: number; transferred: number; total: number }): void => {
		this.logger_.info(`Download progress... ${progressObj.percent}% completed`);
	};

	private onUpdateDownloaded = (info: UpdateInfo): void => {
		this.logger_.info('Update downloaded.');
		void this.promptUserToUpdate(info);
	};

	private onError = (error: Error): void => {
		this.logger_.error('Error in auto-updater.', error);
	};

	private promptUserToUpdate = async (info: UpdateInfo): Promise<void> => {
		this.window_.webContents.send(AutoUpdaterEvents.UpdateDownloaded, info);
	};
}
