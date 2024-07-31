"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoUpdaterEvents = void 0;
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const electron_log_1 = require("electron-log");
const path = require("path");
const timers_1 = require("timers");
var AutoUpdaterEvents;
(function (AutoUpdaterEvents) {
    AutoUpdaterEvents["CheckingForUpdate"] = "checking-for-update";
    AutoUpdaterEvents["UpdateAvailable"] = "update-available";
    AutoUpdaterEvents["UpdateNotAvailable"] = "update-not-available";
    AutoUpdaterEvents["Error"] = "error";
    AutoUpdaterEvents["DownloadProgress"] = "download-progress";
    AutoUpdaterEvents["UpdateDownloaded"] = "update-downloaded";
})(AutoUpdaterEvents || (exports.AutoUpdaterEvents = AutoUpdaterEvents = {}));
const defaultUpdateInterval = 12 * 60 * 60 * 1000;
const initialUpdateStartup = 5 * 1000;
class AutoUpdaterService {
    constructor() {
        this.updatePollInterval_ = null;
        this.startPeriodicUpdateCheck = (interval = defaultUpdateInterval) => {
            this.stopPeriodicUpdateCheck();
            this.updatePollInterval_ = (0, timers_1.setInterval)(() => {
                void this.checkForUpdates();
            }, interval);
            setTimeout(this.checkForUpdates, initialUpdateStartup);
        };
        this.stopPeriodicUpdateCheck = () => {
            if (this.updatePollInterval_) {
                clearInterval(this.updatePollInterval_);
                this.updatePollInterval_ = null;
            }
        };
        this.checkForUpdates = () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield electron_updater_1.autoUpdater.checkForUpdates(); // Use async/await
            }
            catch (error) {
                electron_log_1.default.error('Failed to check for updates:', error);
                if (error.message.includes('ERR_CONNECTION_REFUSED')) {
                    electron_log_1.default.info('Server is not reachable. Will try again later.');
                }
            }
        });
        this.configureAutoUpdater = () => {
            electron_updater_1.autoUpdater.logger = electron_log_1.default;
            electron_log_1.default.transports.file.level = 'info';
            if (this.electronIsDev()) {
                electron_log_1.default.info('Development mode: using dev-app-update.yml');
                electron_updater_1.autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
                electron_updater_1.autoUpdater.forceDevUpdateConfig = true;
            }
            electron_updater_1.autoUpdater.autoDownload = false;
            electron_updater_1.autoUpdater.on(AutoUpdaterEvents.CheckingForUpdate, this.onCheckingForUpdate);
            electron_updater_1.autoUpdater.on(AutoUpdaterEvents.UpdateNotAvailable, this.onUpdateNotAvailable);
            electron_updater_1.autoUpdater.on(AutoUpdaterEvents.UpdateAvailable, this.onUpdateAvailable);
            electron_updater_1.autoUpdater.on(AutoUpdaterEvents.DownloadProgress, this.onDownloadProgress);
            electron_updater_1.autoUpdater.on(AutoUpdaterEvents.UpdateDownloaded, this.onUpdateDownloaded);
            electron_updater_1.autoUpdater.on(AutoUpdaterEvents.Error, this.onError);
        };
        this.electronIsDev = () => !electron_1.app.isPackaged;
        this.onCheckingForUpdate = () => {
            electron_log_1.default.info('Checking for update...');
        };
        this.onUpdateNotAvailable = (_info) => {
            electron_log_1.default.info('Update not available.');
        };
        this.onUpdateAvailable = (info) => {
            electron_log_1.default.info(`Update available: ${info.version}.`);
        };
        this.onDownloadProgress = (progressObj) => {
            electron_log_1.default.info(`Download progress... ${progressObj.percent}% completed`);
        };
        this.onUpdateDownloaded = (info) => {
            electron_log_1.default.info('Update downloaded. It will be installed on restart.');
            void this.promptUserToUpdate(info);
        };
        this.onError = (error) => {
            electron_log_1.default.error('Error in auto-updater.', error);
        };
        this.promptUserToUpdate = (info) => __awaiter(this, void 0, void 0, function* () {
            electron_log_1.default.info(`Update is available: ${info.version}.`);
        });
        this.configureAutoUpdater();
    }
}
exports.default = AutoUpdaterService;
//# sourceMappingURL=AutoUpdaterService.js.map