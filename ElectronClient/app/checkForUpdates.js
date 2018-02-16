const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');

let autoUpdateLogger_ = new Logger();
let checkInBackground_ = false;
let isCheckingForUpdate_ = false;
let parentWindow_ = null;

// Note: Electron Builder's autoUpdater is incredibly buggy so currently it's only used
// to detect if a new version is present. If it is, the download link is simply opened
// in a new browser window.
autoUpdater.autoDownload = false;

function htmlToText_(html) {
	let output = html.replace(/\n/g, '');
	output = output.replace(/<li>/g, '- ');
	output = output.replace(/<p>/g, '');
	output = output.replace(/<\/p>/g, '\n');
	output = output.replace(/<\/li>/g, '\n');
	output = output.replace(/<ul>/g, '');
	output = output.replace(/<\/ul>/g, '');
	output = output.replace(/<.*?>/g, '');
	output = output.replace(/<\/.*?>/g, '');
	return output;
}

function showErrorMessageBox(message) {
	return dialog.showMessageBox(parentWindow_, {
		type: 'error',
		message: message,
	});
}

function onCheckStarted() {
	autoUpdateLogger_.info('checkForUpdates: Starting...');
	isCheckingForUpdate_ = true;
}

function onCheckEnded() {
	autoUpdateLogger_.info('checkForUpdates: Done.');
	isCheckingForUpdate_ = false;
}

autoUpdater.on('error', (error) => {
	autoUpdateLogger_.error(error);
	if (checkInBackground_) return onCheckEnded();
	showErrorMessageBox(error == null ? "unknown" : (error.stack || error).toString())
	onCheckEnded();
})

autoUpdater.on('update-available', (info) => {
	if (!info.version || !info.path) {
		if (checkInBackground_) return onCheckEnded();
		showErrorMessageBox(('Could not get version info: ' + JSON.stringify(info)));
		return onCheckEnded();
	}

	const downloadUrl = 'https://github.com/laurent22/joplin/releases/download/v' + info.version + '/' + info.path;

	let releaseNotes = info.releaseNotes + '';
	if (releaseNotes) releaseNotes = '\n\n' + _('Release notes:\n\n%s', htmlToText_(releaseNotes));

	const buttonIndex = dialog.showMessageBox(parentWindow_, {
		type: 'info',
		message: _('An update is available, do you want to download it now?' + releaseNotes),
		buttons: [_('Yes'), _('No')]
	});

	onCheckEnded();

	if (buttonIndex === 0) require('electron').shell.openExternal(downloadUrl);
})

autoUpdater.on('update-not-available', () => {
	if (checkInBackground_) return onCheckEnded();
	dialog.showMessageBox({ message: _('Current version is up-to-date.') })
	onCheckEnded();
})

function checkForUpdates(inBackground, window, logFilePath) {
	if (isCheckingForUpdate_) {
		autoUpdateLogger_.info('checkForUpdates: Skipping check because it is already running');
		return;
	}

	parentWindow_ = window;

	onCheckStarted();

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
		if (!checkInBackground_) showErrorMessageBox(error.message);
		onCheckEnded();
	}
}

module.exports.checkForUpdates = checkForUpdates