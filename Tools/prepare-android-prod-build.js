const fs = require('fs-extra');

const rnDir = __dirname + '/../ReactNativeClient';

function increaseGradleVersionCode(content) {
	const newContent = content.replace(/versionCode\s+(\d+)/, function(a, versionCode, c) {
		const n = Number(versionCode);
		if (isNaN(n) || !n) throw new Error('Invalid version code: ' + versionCode);
		return 'versionCode ' + (n + 1);
	});

	if (newContent === content) throw new Error('Could not update version code');

	return newContent;
}

function increaseGradleVersionName(content) {
	const newContent = content.replace(/(versionName\s+"\d+?\.\d+?\.)(\d+)"/, function(match, prefix, buildNum) {
		const n = Number(buildNum);
		if (isNaN(n) || !n) throw new Error('Invalid version code: ' + versionCode);
		return prefix + (n + 1) + '"';
	});

	if (newContent === content) throw new Error('Could not update version name');

	return newContent;
}

function updateGradleConfig() {
	let content = fs.readFileSync(rnDir + '/android/app/build.gradle', 'utf8');
	content = increaseGradleVersionCode(content);
	content = increaseGradleVersionName(content);
	fs.writeFileSync(rnDir + '/android/app/build.gradle', content);
}

updateGradleConfig();