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

export interface AutoUpdaterServiceInterface {
	checkForUpdates(): void;
	updateApp(): void;
}

export default class AutoUpdaterService implements AutoUpdaterServiceInterface {
	private window_: BrowserWindow;
	private logger_: LoggerWrapper;
	private devMode_: boolean;
	private enableDevMode = true; // force the updater to work in "dev" mode
	private enableAutoDownload = false; // automatically download an update when it is found
	private autoInstallOnAppQuit = false; // automatically install the downloaded update once the user closes the application
	private includePreReleases_ = false;
	private allowDowngrade = false;

	public constructor(mainWindow: BrowserWindow, logger: LoggerWrapper, devMode: boolean, includePreReleases: boolean) {
		this.window_ = mainWindow;
		this.logger_ = logger;
		this.devMode_ = devMode;
		this.includePreReleases_ = includePreReleases;
		this.configureAutoUpdater();
	}

	public checkForUpdates = async (): Promise<void> => {
		try {
			await this.fetchLatestRelease();
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

	private fetchLatestReleases = async (): Promise<GitHubRelease[]> => {
		const response = await fetch(releasesLink);

		if (!response.ok) {
			const responseText = await response.text();
			throw new Error(`Cannot get latest release info: ${responseText.substr(0, 500)}`);
		}

		return (await response.json()) as GitHubRelease[];
	};

	private fetchLatestRelease = async (): Promise<void> => {
		try {
			const releases = await this.fetchLatestReleases();

			const sortedReleasesByVersion = releases.sort((a, b) => {
				return semver.rcompare(a.tag_name, b.tag_name);
			});
			const filteredReleases = sortedReleasesByVersion.filter(release => {
				return this.includePreReleases_ || !release.prerelease;
			});
			const release = filteredReleases[0];

			if (release) {
				let assetUrl = null;

				if (shim.isWindows()) {
					const asset = release.assets.find((asset: GitHubReleaseAsset) => asset.name === 'latest.yml');
					if (asset) {
						assetUrl = asset.browser_download_url.replace('/latest.yml', '');
					}
				} else if (shim.isMac()) {
					const asset = release.assets.find((asset: GitHubReleaseAsset) => asset.name === 'latest-mac.yml');
					if (asset) {
						assetUrl = asset.browser_download_url.replace('/latest-mac.yml', '');
					}
				}

				if (assetUrl) {
					autoUpdater.setFeedURL({
						provider: 'generic',
						url: assetUrl,
					});
					await autoUpdater.checkForUpdates();
				} else {
					this.logger_.error('No suitable update asset found for this platform.');
				}
			}
		} catch (error) {
			this.logger_.error(error);
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
