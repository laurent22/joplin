'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = notarizeFile;
const fs_1 = require('fs');
const notarize_1 = require('@electron/notarize');
const execCommand = require('./execCommand');
const child_process_1 = require('child_process');
const util_1 = require('util');
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Same appId in electron-builder.
const appId = 'net.cozic.joplin-desktop';
function isDesktopAppTag(tagName) {
	if (!tagName) { return false; }
	return tagName[0] === 'v';
}
async function notarizeFile(filePath) {
	if (process.platform !== 'darwin') { return; }
	console.info(`Checking if notarization should be done on: ${filePath}`);
	if (!process.env.IS_CONTINUOUS_INTEGRATION || !isDesktopAppTag(process.env.GIT_TAG_NAME)) {
		console.info(`Either not running in CI or not processing a desktop app tag - skipping notarization. process.env.IS_CONTINUOUS_INTEGRATION = ${process.env.IS_CONTINUOUS_INTEGRATION}; process.env.GIT_TAG_NAME = ${process.env.GIT_TAG_NAME}`);
		return;
	}
	if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
		console.warn('Environment variables APPLE_ID and APPLE_ID_PASSWORD not found - notarization will NOT be done.');
		return;
	}
	if (!(0, fs_1.existsSync)(filePath)) {
		throw new Error(`Cannot find file at: ${filePath}`);
	}
	// Every x seconds we print something to stdout, otherwise CI may timeout
	// the task after 10 minutes, and Apple notarization can take more time.
	const waitingIntervalId = setInterval(() => {
		console.info('.');
	}, 60000);
	const isPkg = filePath.endsWith('.pkg');
	console.info(`Notarizing ${filePath}`);
	try {
		if (isPkg) {
			await execAsync(`xcrun notarytool submit "${filePath}" ` +
                `--apple-id "${process.env.APPLE_ID}" ` +
                `--password "${process.env.APPLE_ID_PASSWORD}" ` +
                `--team-id "${process.env.APPLE_ASC_PROVIDER}" ` +
                '--wait', { maxBuffer: 1024 * 1024 });
		} else {
			await (0, notarize_1.notarize)({
				appBundleId: appId,
				appPath: filePath,
				// Apple Developer email address
				appleId: process.env.APPLE_ID,
				// App-specific password: https://support.apple.com/en-us/HT204397
				appleIdPassword: process.env.APPLE_ID_PASSWORD,
				// When Apple ID is attached to multiple providers (eg if the
				// account has been used to build multiple apps for different
				// companies), in that case the provider "Team Short Name" (also
				// known as "ProviderShortname") must be provided.
				//
				// Use this to get it:
				//
				// xcrun altool --list-providers -u APPLE_ID -p APPLE_ID_PASSWORD
				// ascProvider: process.env.APPLE_ASC_PROVIDER,
				// In our case, the team ID is the same as the legacy ASC_PROVIDER
				teamId: process.env.APPLE_ASC_PROVIDER,
				tool: 'notarytool',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			});
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
	clearInterval(waitingIntervalId);
	// It appears that electron-notarize doesn't staple the app, but without
	// this we were still getting the malware warning when launching the app.
	// Stapling the app means attaching the notarization ticket to it, so that
	// if the user is offline, macOS can still check if the app was notarized.
	// So it seems to be more or less optional, but at least in our case it
	// wasn't.
	console.info('Stapling notarization ticket to the file...');
	const staplerCmd = `xcrun stapler staple "${filePath}"`;
	console.info(`> ${staplerCmd}`);
	console.info(await execCommand(staplerCmd));
	console.info(`Validating stapled file: ${filePath}`);
	try {
		await execAsync(`spctl -a -vv -t install "${filePath}"`);
	} catch (error) {
		console.error(`Failed validating stapled file: ${filePath}:`, error);
	}
	console.info(`Done notarizing ${filePath}`);
}
// # sourceMappingURL=notarizeFile.js.map
