// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

const fs = require('fs');
const path = require('path');
const electron_notarize = require('electron-notarize');

module.exports = async function(params) {
	// Only notarize the app on Mac OS only.
	if (process.platform !== 'darwin') {
		return;
	}
	console.log('afterSign hook triggered', params);

	// Same appId in electron-builder.
	const appId = 'net.cozic.joplin-desktop';

	const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
	if (!fs.existsSync(appPath)) {
		throw new Error(`Cannot find application at: ${appPath}`);
	}

	console.log(`Notarizing ${appId} found at ${appPath}`);

	try {
		await electron_notarize.notarize({
			appBundleId: appId,
			appPath: appPath,
			// Apple Developer email address
			appleId: process.env.APPLE_ID,
			// App-specific password: https://support.apple.com/en-us/HT204397
			appleIdPassword: process.env.APPLE_ID_PASSWORD,
		});
	} catch (error) {
		console.error(error);
	}

	console.log(`Done notarizing ${appId}`);
};
