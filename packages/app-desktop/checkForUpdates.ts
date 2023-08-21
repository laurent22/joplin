import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { _ } from '@joplin/lib/locale';
import bridge from './services/bridge';
import KvStore from '@joplin/lib/services/KvStore';
import * as ArrayUtils from '@joplin/lib/ArrayUtils';
import { CheckForUpdateOptions, extractVersionInfo, GitHubRelease } from './utils/checkForUpdatesUtils';
const packageInfo = require('./packageInfo.js');
const compareVersions = require('compare-versions');

const logger = Logger.create('checkForUpdates');

let checkInBackground_ = false;
let isCheckingForUpdate_ = false;

function onCheckStarted() {
	logger.info('Starting...');
	isCheckingForUpdate_ = true;
}

function onCheckEnded() {
	logger.info('Done.');
	isCheckingForUpdate_ = false;
}

async function fetchLatestReleases() {
	const response = await shim.fetch('https://objects.joplinusercontent.com/r/releases');

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(`Cannot get latest release info: ${responseText.substr(0, 500)}`);
	}

	return (await response.json()) as GitHubRelease[];
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
		const releases = await fetchLatestReleases();
		const release = extractVersionInfo(releases, process.platform, process.arch, shim.isPortable(), options);

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
