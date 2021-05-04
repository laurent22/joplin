const { dialog } = require('electron');
const shim = require('@joplin/lib/shim').default;
const Logger = require('@joplin/lib/Logger').default;
const { _ } = require('@joplin/lib/locale');
const fetch = require('node-fetch');
const { fileExtension } = require('@joplin/lib/path-utils');
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

function getMajorMinorTagName(tagName) {
	const s = tagName.split('.');
	s.pop();
	return s.join('.');
}

async function fetchLatestRelease(options) {
	options = Object.assign({}, { includePreReleases: false }, options);

	const response = await fetch('https://api.github.com/repos/laurent22/joplin/releases');

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(`Cannot get latest release info: ${responseText.substr(0,500)}`);
	}

	const releases = await response.json();
	if (!releases.length) throw new Error('Cannot get latest release info (JSON)');

	let release = null;

	if (options.includePreReleases) {
		release = releases[0];
	} else {
		for (const r of releases) {
			if (!r.prerelease) {
				release = r;
				break;
			}
		}
	}

	if (!release) throw new Error('Could not get tag name');

	const version = release.tag_name.substr(1);

	// We concatenate all the release notes of the major/minor versions
	// corresponding to the latest version. For example, if the latest version
	// is 1.8.3, we concatenate all the 1.8.x versions. This is so that no
	// matter from which version you upgrade, you always see the full changes,
	// with the latest changes being on top.

	const fullReleaseNotes = [];
	const majorMinorTagName = getMajorMinorTagName(release.tag_name);

	for (const release of releases) {
		if (getMajorMinorTagName(release.tag_name) === majorMinorTagName) {
			fullReleaseNotes.push(release.body.trim());
		}
	}

	let downloadUrl = null;
	const platform = process.platform;
	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
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

	function cleanUpReleaseNotes(releaseNotes) {
		const lines = releaseNotes.join('\n\n* * *\n\n').split('\n');
		const output = [];
		for (const line of lines) {
			const r = line
				.replace(/\(#.* by .*\)/g, '') // Removes issue numbers and names - (#3157 by [@user](https://github.com/user))
				.replace(/\([0-9a-z]{7}\)/g, '') // Removes commits - "sync state or data (a6caa35)"
				.replace(/\(#[0-9]+\)/g, '') // Removes issue numbers - "(#4727)"
				.replace(/ {2}/g, ' ')
				.trim();

			output.push(r);
		}
		return output.join('\n');
	}

	return {
		version: version,
		downloadUrl: downloadUrl,
		notes: cleanUpReleaseNotes(fullReleaseNotes),
		pageUrl: release.html_url,
		prerelease: release.prerelease,
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
			if (!checkInBackground_) {
				await dialog.showMessageBox({
					type: 'info',
					message: _('Current version is up-to-date.'),
					buttons: [_('OK')],
				});
			}
		} else {
			const fullReleaseNotes = release.notes.trim() ? `\n\n${release.notes.trim()}` : '';
			const MAX_RELEASE_NOTES_LENGTH = 1000;
			const truncateReleaseNotes = fullReleaseNotes.length > MAX_RELEASE_NOTES_LENGTH;
			const releaseNotes = truncateReleaseNotes ? truncateText(fullReleaseNotes, MAX_RELEASE_NOTES_LENGTH) : fullReleaseNotes;

			const newVersionString = release.prerelease ? _('%s (pre-release)', release.version) : release.version;

			const result = await dialog.showMessageBox(parentWindow_, {
				type: 'info',
				message: `${_('An update is available, do you want to download it now?')}`,
				detail: `${_('Your version: %s', packageInfo.version)}\n${_('New version: %s', newVersionString)}${releaseNotes}`,
				buttons: [_('Download'), _('Cancel'), _('Full changelog')],
				cancelId: 1,
			});

			const buttonIndex = result.response;
			if (buttonIndex === 0) require('electron').shell.openExternal(release.downloadUrl ? release.downloadUrl : release.pageUrl);
			if (buttonIndex === 2) require('electron').shell.openExternal('https://joplinapp.org/changelog/');
		}
	}).catch(error => {
		autoUpdateLogger_.error(error);
		if (!checkInBackground_) showErrorMessageBox(error.message);
	}).then(() => {
		onCheckEnded();
	});
}

module.exports.checkForUpdates = checkForUpdates;
