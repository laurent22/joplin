const fs = require('fs');
const path = require('path');
const electron_notarize = require('electron-notarize');

function execCommand(command) {
	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(new Error([stdout.trim(), stderr.trim()].join('\n')));
				}
			} else {
				resolve([stdout.trim(), stderr.trim()].join('\n'));
			}
		});
	});
}

module.exports = async function(params) {
	if (process.platform !== 'darwin') return;

	console.info('Checking if notarization should be done...');

	if (!process.env.TRAVIS || !process.env.TRAVIS_TAG) {
		console.info(`Either not running in CI or not processing a tag - skipping notarization. process.env.TRAVIS = ${process.env.TRAVIS}; process.env.TRAVIS_TAG = ${process.env.TRAVIS}`);
		return;
	}

	if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
		console.warn('Environment variables APPLE_ID and APPLE_ID_PASSWORD not found - notarization will NOT be done.');
		return;
	}

	// Same appId in electron-builder.
	const appId = 'net.cozic.joplin-desktop';

	const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
	if (!fs.existsSync(appPath)) {
		throw new Error(`Cannot find application at: ${appPath}`);
	}

	console.log(`Notarizing ${appId} found at ${appPath}`);

	await electron_notarize.notarize({
		appBundleId: appId,
		appPath: appPath,

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
		ascProvider: process.env.APPLE_ASC_PROVIDER,
	});

	console.log('Staple notarization ticket to the app...');

	const staplerCmd = `xcrun stapler staple "${appPath}"`;
	console.log(`> ${staplerCmd}`);
	console.log(await execCommand(staplerCmd));

	console.log(`Done notarizing ${appId}`);
};
