const { dialog } = require('electron')
const { shim } = require('lib/shim');
const { Logger } = require('lib/logger.js');
const { _ } = require('lib/locale.js');
const fetch = require('node-fetch');
const { fileExtension } = require('lib/path-utils.js');
const packageInfo = require('./packageInfo.js');
const compareVersions = require('compare-versions');

let autoUpdateLogger_ = new Logger();
let checkInBackground_ = false;
let isCheckingForUpdate_ = false;
let parentWindow_ = null;

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

async function fetchLatestRelease() {
	const response = await fetch('https://api.github.com/repos/laurent22/joplin/releases/latest');

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error('Cannot get latest release info: ' + responseText.substr(0,500));
	}

	const json = await response.json();
	
	const version = json.tag_name.substr(1);
	let downloadUrl = null;
	const platform = process.platform;
	for (let i = 0; i < json.assets.length; i++) {
		const asset = json.assets[i];
		let found = false;
		const ext = fileExtension(asset.name);
		if (platform === 'win32' && ext === 'exe') {
			if (shim.isPortable()) {
				found = asset.name == 'JoplinPortable.exe';
			} else {
				found = !!asset.name.match(/^Joplin-Setup-[\d.]+\.exe$/);
			}
		} else if (platform === 'darwin' && ext === 'dmg') {
			found = true;
		} else if (platform === 'linux' && ext === '.AppImage') {
			found = true;
		}

		if (found) {
			downloadUrl = asset.browser_download_url;
			break;
		}
	}

	if (!downloadUrl) throw new Error('Cannot find download Url: ' + JSON.stringify(json).substr(0,500));

	return {
		version: version,
		downloadUrl: downloadUrl,
		notes: json.body,
	};
}

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
	}

	checkInBackground_ = inBackground;

	fetchLatestRelease().then(release => {
		if (compareVersions(release.version, packageInfo.version) <= 0) {
			if (!checkInBackground_) dialog.showMessageBox({ message: _('Current version is up-to-date.') })
		} else {
			const releaseNotes = release.notes.trim() ? "\n\n" + release.notes.trim() : '';

			const buttonIndex = dialog.showMessageBox(parentWindow_, {
				type: 'info',
				message: _('An update is available, do you want to download it now?' + releaseNotes),
				buttons: [_('Yes'), _('No')]
			});

			if (buttonIndex === 0) require('electron').shell.openExternal(release.downloadUrl);
		}
	}).catch(error => {
		autoUpdateLogger_.error(error);
		if (!checkInBackground_) showErrorMessageBox(error.message);
	}).then(() => {
		onCheckEnded();
	});
}

module.exports.checkForUpdates = checkForUpdates