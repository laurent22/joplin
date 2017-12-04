const fs = require('fs-extra');
const toolUtils = require('./tool-utils.js');

const rnDir = __dirname + '/../ReactNativeClient';

function androidVersionNumber() {
	let content = fs.readFileSync(rnDir + '/android/app/build.gradle', 'utf8');
	const r = content.match(/versionName\s+"(\d+?\.\d+?\.\d+)"/)
	if (r.length !== 2) throw new Error('Could not get version number');
	return r[1];
}

// const 

// '/android/app/build/outputs/apk/app-armeabi-v7a-release.apk'


console.info(androidVersionNumber());