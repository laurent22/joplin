const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');

let autoUpdateLogger_ = new Logger();
let checkInBackground_ = false;

// Note: Electron Builder's autoUpdater is incredibly buggy so currently it's only used
// to detect if a new version is present. If it is, the download link is simply opened
// in a new browser window.
autoUpdater.autoDownload = false;

autoUpdater.on('error', (error) => {
	autoUpdateLogger_.error(error);
	if (checkInBackground_) return;
	dialog.showErrorBox(_('Error'), error == null ? "unknown" : (error.stack || error).toString())
})

function htmlToText_(html) {
	let output = html.replace(/\n/g, '');
	output = output.replace(/<li>/g, '- ');
	output = output.replace(/<\/li>/g, '\n');
	output = output.replace(/<ul>/g, '');
	output = output.replace(/<\/ul>/g, '');
	output = output.replace(/<.*?>/g, '');
	output = output.replace(/<\/.*?>/g, '');
	return output;
}

autoUpdater.on('update-available', (info) => {
	if (!info.version || !info.path) {
		if (checkInBackground_) return;
		dialog.showErrorBox(_('Error'), ('Could not get version info: ' + JSON.stringify(info)));
		return;
	}

	const downloadUrl = 'https://github.com/laurent22/joplin/releases/download/v' + info.version + '/' + info.path;

	let releaseNotes = info.releaseNotes + '';
	if (releaseNotes) releaseNotes = '\n\n' + _('Release notes:\n\n%s', htmlToText_(releaseNotes));

	dialog.showMessageBox({
		type: 'info',
		message: _('An update is available, do you want to download it now?' + releaseNotes),
		buttons: [_('Yes'), _('No')]
	}, (buttonIndex) => {
		if (buttonIndex === 0) {
			require('electron').shell.openExternal(downloadUrl);
		}
	})
})

autoUpdater.on('update-not-available', () => {
	if (checkInBackground_) return;

	dialog.showMessageBox({ message: _('Current version is up-to-date.') })
})

// autoUpdater.on('update-downloaded', () => {
// 	dialog.showMessageBox({ message: _('New version downloaded - application will quit now and update...') }, () => {
// 		setTimeout(() => {
// 			try {
// 				autoUpdater.quitAndInstall();
// 			} catch (error) {
// 				autoUpdateLogger_.error(error);
// 				dialog.showErrorBox(_('Error'), _('Could not install the update: %s', error.message));
// 			}
// 		}, 100);
// 	})
// })

function checkForUpdates(inBackground, logFilePath) {
	if (logFilePath && !autoUpdateLogger_.targets().length) {
		autoUpdateLogger_ = new Logger();
		autoUpdateLogger_.addTarget('file', { path: logFilePath });
		autoUpdateLogger_.setLevel(Logger.LEVEL_DEBUG);
		autoUpdateLogger_.info('checkForUpdates: Initializing...');
		autoUpdater.logger = autoUpdateLogger_;
	}

	checkInBackground_ = inBackground;

	try {
		autoUpdater.checkForUpdates()
	} catch (error) {
		autoUpdateLogger_.error(error);
		if (!checkInBackground_) dialog.showErrorBox(_('Error'), error.message);
	}
}

module.exports.checkForUpdates = checkForUpdates