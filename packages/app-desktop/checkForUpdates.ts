import shim from '@joplin/lib/shim';
import Logger from '@joplin/lib/Logger';
import { _ } from '@joplin/lib/locale';
import bridge from './services/bridge';
import KvStore from '@joplin/lib/services/KvStore';
const { fileExtension } = require('@joplin/lib/path-utils');
import * as ArrayUtils from '@joplin/lib/ArrayUtils';
const packageInfo = require('./packageInfo.js');
const compareVersions = require('compare-versions');

const logger = Logger.create('checkForUpdates');

let checkInBackground_ = false;
let isCheckingForUpdate_ = false;

interface CheckForUpdateOptions {
	includePreReleases?: boolean;
}

function onCheckStarted() {
	logger.info('Starting...');
	isCheckingForUpdate_ = true;
}

function onCheckEnded() {
	logger.info('Done.');
	isCheckingForUpdate_ = false;
}

function getMajorMinorTagName(tagName: string) {
	const s = tagName.split('.');
	s.pop();
	return s.join('.');
}

async function fetchLatestRelease(options: CheckForUpdateOptions) {
	options = Object.assign({}, { includePreReleases: false }, options);

	const response = await shim.fetch('https://api.github.com/repos/laurent22/joplin/releases');

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(`Cannot get latest release info: ${responseText.substr(0, 500)}`);
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
				found = asset.name === 'JoplinPortable.exe';
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

	function cleanUpReleaseNotes(releaseNotes: string[]) {
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

function truncateText(text: string, length: number) {
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

async function getSkippedVersions(): Promise<string[]> {
	const r = await KvStore.instance().value<string>('updateCheck::skippedVersions');
	return r ? JSON.parse(r) : [];
}

async function isSkippedVersion(v: string): Promise<boolean> {
	const versions = await getSkippedVersions();
	return versions.includes(v);
}

async function addSkippedVersion(s: string) {
	let versions = await getSkippedVersions();
	versions.push(s);
	versions = ArrayUtils.unique(versions);
	await KvStore.instance().setValue('updateCheck::skippedVersions', JSON.stringify(versions));
}

export default async function checkForUpdates(inBackground: boolean, parentWindow: any, options: CheckForUpdateOptions) {
	if (isCheckingForUpdate_) {
		logger.info('Skipping check because it is already running');
		return;
	}

	onCheckStarted();

	checkInBackground_ = inBackground;

	logger.info(`Checking with options ${JSON.stringify(options)}`);

	try {
		const release = await fetchLatestRelease(options);

		logger.info(`Current version: ${packageInfo.version}`);
		logger.info(`Latest version: ${release.version}`);
		logger.info('Is Pre-release:', release.prerelease);

		if (compareVersions(release.version, packageInfo.version) <= 0) {
			if (!checkInBackground_) {
				await bridge().showMessageBox(_('Current version is up-to-date.'));
			}
		} else {
			const shouldSkip = checkInBackground_ && await isSkippedVersion(release.version);

			if (shouldSkip) {
				logger.info('Not displaying notification because version has been skipped');
			} else {
				const fullReleaseNotes = release.notes.trim() ? `\n\n${release.notes.trim()}` : '';
				const MAX_RELEASE_NOTES_LENGTH = 1000;
				const truncateReleaseNotes = fullReleaseNotes.length > MAX_RELEASE_NOTES_LENGTH;
				const releaseNotes = truncateReleaseNotes ? truncateText(fullReleaseNotes, MAX_RELEASE_NOTES_LENGTH) : fullReleaseNotes;

				const newVersionString = release.prerelease ? _('%s (pre-release)', release.version) : release.version;

				const buttonIndex = await bridge().showMessageBox(parentWindow, {
					type: 'info',
					message: `${_('An update is available, do you want to download it now?')}`,
					detail: `${_('Your version: %s', packageInfo.version)}\n${_('New version: %s', newVersionString)}${releaseNotes}`,
					buttons: [_('Download'), _('Skip this version'), _('Full changelog'), _('Cancel')],
					cancelId: 3,
				});

				if (buttonIndex === 0) {
					void bridge().openExternal(release.downloadUrl ? release.downloadUrl : release.pageUrl);
				} else if (buttonIndex === 1) {
					await addSkippedVersion(release.version);
				} else if (buttonIndex === 2) {
					void bridge().openExternal('https://joplinapp.org/changelog/');
				}
			}
		}
	} catch (error) {
		logger.error(error);
		if (!checkInBackground_) await bridge().showErrorMessageBox(error.message);
	} finally {
		onCheckEnded();
	}
}
