const { dialog } = require('electron');
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

async function fetchLatestRelease(options) {
	options = Object.assign({}, { includePreReleases: false }, options);

	let json = null;

	if (options.includePreReleases) {
		// This end-point will include all releases, including pre-releases (but not draft), so we take
		// whatever is the latest release. It might be the same as releases/latest, or it might be
		// a pre-release.
		const response = await fetch('https://api.github.com/repos/laurent22/joplin/releases');

		if (!response.ok) {
			const responseText = await response.text();
			throw new Error(`Cannot get latest release info: ${responseText.substr(0,500)}`);
		}

		json = await response.json();
		if (!json.length) throw new Error('Cannot get latest release info (JSON)');
		json = json[0];
	} else {
		const response = await fetch('https://api.github.com/repos/laurent22/joplin/releases/latest');

		if (!response.ok) {
			const responseText = await response.text();
			throw new Error(`Cannot get latest release info: ${responseText.substr(0,500)}`);
		}

		json = await response.json();
	}

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

	return {
		version: version,
		downloadUrl: downloadUrl,
		notes: json.body,
		pageUrl: json.html_url,
		prerelease: json.prerelease,
	};
}

function truncateText(text, length) {
	let truncated = text.substring(0, length);
	const lastNewLine = truncated.lastIndexOf('\n');
	// Cut off at a line break unless we'd be cutting off half the text
	if (lastNewLine > length / 2) {
		truncated = `${truncated.substring(0, lastNewLine)}\n...`;
	} else {
		truncated = `${truncated.trim()}...`;
	}
	return truncated;
}

function checkForUpdates(inBackground, window, logFilePath, options) {
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

	autoUpdateLogger_.info(`checkForUpdates: Checking with options ${JSON.stringify(options)}`);

	fetchLatestRelease(options).then(async (release) => {
		autoUpdateLogger_.info(`Current version: ${packageInfo.version}`);
		autoUpdateLogger_.info(`Latest version: ${release.version}`);
		autoUpdateLogger_.info('Is Pre-release:', release.prerelease);

		if (compareVersions(release.version, packageInfo.version) <= 0) {
			if (!checkInBackground_) await dialog.showMessageBox({
				type: 'info',
				message: _('Current version is up-to-date.'),
				buttons: [_('OK')],
			});
		} else {
			const fullReleaseNotes = release.notes.trim() ? `\n\n${release.notes.trim()}` : '';
			const MAX_RELEASE_NOTES_LENGTH = 1000;
			const truncateReleaseNotes = fullReleaseNotes.length > MAX_RELEASE_NOTES_LENGTH;
			const releaseNotes = truncateReleaseNotes ? truncateText(fullReleaseNotes, MAX_RELEASE_NOTES_LENGTH) : fullReleaseNotes;

			const newVersionString = release.prerelease ? _('%s (pre-release)', release.version) : release.version;

			const result = await dialog.showMessageBox(parentWindow_, {
				type: 'info',
				message: `${_('An update is available, do you want to download it now?')}\n\n${_('Your version: %s', packageInfo.version)}\n${_('New version: %s', newVersionString)}${releaseNotes}`,
				buttons: [_('Yes'), _('No')].concat(truncateReleaseNotes ? [_('Full Release Notes')] : []),
			});

			const buttonIndex = result.response;
			if (buttonIndex === 0) require('electron').shell.openExternal(release.downloadUrl ? release.downloadUrl : release.pageUrl);
			if (buttonIndex === 2) require('electron').shell.openExternal(release.pageUrl);
		}
	}).catch(error => {
		autoUpdateLogger_.error(error);
		if (!checkInBackground_) showErrorMessageBox(error.message);
	}).then(() => {
		onCheckEnded();
	});
}

module.exports.checkForUpdates = checkForUpdates;
