import { BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import path = require('path');
import { setInterval } from 'timers';
import Logger, { LoggerWrapper } from '@joplin/utils/Logger';


export enum AutoUpdaterEvents {
	CheckingForUpdate = 'checking-for-update',
	UpdateAvailable = 'update-available',
	UpdateNotAvailable = 'update-not-available',
	Error = 'error',
	DownloadProgress = 'download-progress',
	UpdateDownloaded = 'update-downloaded',
}

const defaultUpdateInterval = 12 * 60 * 60 * 1000;
const initialUpdateStartup = 5 * 1000;

export interface AutoUpdaterServiceInterface {
	startPeriodicUpdateCheck(interval?: number): void;
	stopPeriodicUpdateCheck(): void;
	checkForUpdates(): void;
}

export default class AutoUpdaterService implements AutoUpdaterServiceInterface {
	private window_: BrowserWindow;
	private logger_: LoggerWrapper;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private initializedShim_: any;
	private devMode_: boolean;
	private updatePollInterval_: ReturnType<typeof setInterval>|null = null;
	private enableDevMode = true; // force the updater to work in "dev" mode
	private enableAutoDownload = false; // automatically download an update when it is found
	private allowPrerelease_ = false;
	private allowDowngrade = false;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public constructor(mainWindow: BrowserWindow, logger: LoggerWrapper, initializedShim: any, devMode: boolean, allowPrereleaseUpdates: boolean) {
		this.window_ = mainWindow;
		this.logger_ = logger;
		this.initializedShim_ = initializedShim;
		this.devMode_ = devMode;
		this.allowPrerelease_ = allowPrereleaseUpdates;
		this.configureAutoUpdater();
	}

	public startPeriodicUpdateCheck = (interval: number = defaultUpdateInterval): void => {
		this.stopPeriodicUpdateCheck();
		this.updatePollInterval_ = this.initializedShim_.setInterval(() => {
			void this.checkForUpdates();
		}, interval);
		this.initializedShim_.setTimeout(this.checkForUpdates, initialUpdateStartup);
	};

	public stopPeriodicUpdateCheck = (): void => {
		if (this.updatePollInterval_) {
			clearInterval(this.updatePollInterval_);
			this.updatePollInterval_ = null;
		}
	};

	public checkForUpdates = async (): Promise<void> => {
		try {
			if (this.allowPrerelease_) {
				// If this is set to true, then it will compare the versions semantically and it will also look at tags, so we need to manually get the latest pre-release
				this.logger_.info('To be implemented...');
			} else {
				await autoUpdater.checkForUpdates();
			}
		} catch (error) {
			this.logger_.error('Failed to check for updates:', error);
			if (error.message.includes('ERR_CONNECTION_REFUSED')) {
				this.logger_.info('Server is not reachable. Will try again later.');
			}
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
		autoUpdater.allowPrerelease = this.allowPrerelease_;
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

	public updateApp = (): void => {
		autoUpdater.quitAndInstall(false, true);
	};
}
