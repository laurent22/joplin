const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');

let autoUpdateLogger_ = new Logger();
let checkInBackground_ = false;

autoUpdater.autoDownload = false;

autoUpdater.on('error', (error) => {
	autoUpdateLogger_.error(error);
	if (checkInBackground_) return;
	dialog.showErrorBox(_('Error'), error == null ? "unknown" : (error.stack || error).toString())
})

autoUpdater.on('update-available', () => {
	dialog.showMessageBox({
		type: 'info',
		message: _('An update is available, do you want to update now?'),
		buttons: ['Sure', 'No']
	}, (buttonIndex) => {
		if (buttonIndex === 0) {
			try {
				autoUpdater.downloadUpdate()
			} catch (error) {
				autoUpdateLogger_.error(error);
				dialog.showErrorBox(_('Error'), _('Could not download the update: %s', error.message));
			}
		}
	})
})

autoUpdater.on('update-not-available', () => {
	if (checkInBackground_) return;

	dialog.showMessageBox({ message: _('Current version is up-to-date.') })
})

autoUpdater.on('update-downloaded', () => {
	dialog.showMessageBox({ message: _('New version downloaded - application will quit now and update...') }, () => {
		setTimeout(() => {
			try {
				autoUpdater.quitAndInstall();
			} catch (error) {
				autoUpdateLogger_.error(error);
				dialog.showErrorBox(_('Error'), _('Could not install the update: %s', error.message));
			}
		}, 100);
	})
})

function checkForUpdates(inBackground, logFilePath) {
	if (logFilePath && !autoUpdateLogger_.targets().length) {
		autoUpdateLogger_ = new Logger();
		autoUpdateLogger_.addTarget('file', { path: logFilePath });
		autoUpdateLogger_.setLevel(Logger.LEVEL_DEBUG);
		autoUpdateLogger_.info('checkForUpdates: Initializing...');
		autoUpdater.logger = autoUpdateLogger_;
	}

	checkInBackground_ = inBackground;

	autoUpdater.checkForUpdates()
}

module.exports.checkForUpdates = checkForUpdates