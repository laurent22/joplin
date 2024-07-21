import { app, BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import log from 'electron-log';
import path = require('path');
import { setInterval } from 'timers';


export enum AutoUpdaterEvents {
	CheckingForUpdate = 'checking-for-update',
	UpdateAvailable = 'update-available',
	UpdateNotAvailable = 'update-not-available',
	Error = 'error',
	DownloadProgress = 'download-progress',
	UpdateDownloaded = 'update-downloaded',
}

const DEFAULT_UPDATE_INTERVAL = 12 * 60 * 60 * 1000;
const INITIAL_UPDATE_STARTUP = 5 * 1000;

export interface AutoUpdaterServiceInterface {
	isUpdateDialogOpen: boolean;
	updatePollInterval: ReturnType<typeof setInterval>|null;
	mainWindow: BrowserWindow;
	startPeriodicUpdateCheck(interval?: number): void;
	stopPeriodicUpdateCheck(): void;
	checkForUpdates(): void;
	configureAutoUpdater(): void;
	onCheckingForUpdate(): void;
	onUpdateNotAvailable(info: UpdateInfo): void;
	onUpdateAvailable(info: UpdateInfo): void;
	onDownloadProgress(progressObj: { bytesPerSecond: number; percent: number; transferred: number; total: number }): void;
	onUpdateDownloaded(info: UpdateInfo): void;
	onError(error: Error): void;
	promptUserToUpdate(info: UpdateInfo): Promise<void>;
}

export default class AutoUpdaterService {
	private window_: BrowserWindow;
	private updatePollInterval_: ReturnType<typeof setInterval>|null = null;

	public constructor(mainWindow: BrowserWindow) {
		this.window_ = mainWindow;
		this.configureAutoUpdater();
	}

	public startPeriodicUpdateCheck = (interval: number = DEFAULT_UPDATE_INTERVAL): void => {
		this.stopPeriodicUpdateCheck();
		this.updatePollInterval_ = setInterval(() => {
			void this.checkForUpdates();
		}, interval);
		setTimeout(this.checkForUpdates, INITIAL_UPDATE_STARTUP);
	};

	public stopPeriodicUpdateCheck = (): void => {
		if (this.updatePollInterval_) {
			clearInterval(this.updatePollInterval_);
			this.updatePollInterval_ = null;
		}
	};

	public checkForUpdates = async (): Promise<void> => {
		try {
			await autoUpdater.checkForUpdates(); // Use async/await
		} catch (error) {
			log.error('Failed to check for updates:', error);
			if (error.message.includes('ERR_CONNECTION_REFUSED')) {
				log.info('Server is not reachable. Will try again later.');
			}
		}
	};

	private configureAutoUpdater = (): void => {
		autoUpdater.logger = log;
		log.transports.file.level = 'info';

		if (this.electronIsDev()) {
			log.info('Development mode: using dev-app-update.yml');
			autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
			autoUpdater.forceDevUpdateConfig = true;
		}

		autoUpdater.autoDownload = true;

		autoUpdater.on(AutoUpdaterEvents.CheckingForUpdate, this.onCheckingForUpdate);
		autoUpdater.on(AutoUpdaterEvents.UpdateNotAvailable, this.onUpdateNotAvailable);
		autoUpdater.on(AutoUpdaterEvents.UpdateAvailable, this.onUpdateAvailable);
		autoUpdater.on(AutoUpdaterEvents.DownloadProgress, this.onDownloadProgress);
		autoUpdater.on(AutoUpdaterEvents.UpdateDownloaded, this.onUpdateDownloaded);
		autoUpdater.on(AutoUpdaterEvents.Error, this.onError);
	};

	private electronIsDev = (): boolean => !app.isPackaged;

	private onCheckingForUpdate = () => {
		log.info('Checking for update...');
	};

	private onUpdateNotAvailable = (_info: UpdateInfo): void => {
		log.info('Update not available.');
	};

	private onUpdateAvailable = (info: UpdateInfo): void => {
		log.info(`Update available: ${info.version}.`);
	};

	private onDownloadProgress = (progressObj: { bytesPerSecond: number; percent: number; transferred: number; total: number }): void => {
		log.info(`Download progress... ${progressObj.percent}% completed`);
	};

	private onUpdateDownloaded = (info: UpdateInfo): void => {
		log.info('Update downloaded. It will be installed on restart.');
		void this.promptUserToUpdate(info);
	};

	private onError = (error: Error): void => {
		log.error('Error in auto-updater.', error);
	};

	private promptUserToUpdate = async (info: UpdateInfo): Promise<void> => {
		log.info(`Update is available: ${info.version}.`);
		// this.window_.webContents.send(AutoUpdaterEvents.UpdateDownloaded, info);
	};

	public updateApp = (): void => {
		autoUpdater.quitAndInstall(false, true);
	};

}
