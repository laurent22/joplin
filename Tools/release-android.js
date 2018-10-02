const fs = require('fs-extra');
const { execCommand, githubRelease, githubOauthToken } = require('./tool-utils.js');
const path = require('path');
const fetch = require('node-fetch');
const uriTemplate = require('uri-template');

const rnDir = __dirname + '/../ReactNativeClient';
const rootDir = path.dirname(__dirname);
const releaseDir = rootDir + '/_releases';

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
	return content;
}

function gradleVersionName(content) {
	const matches = content.match(/versionName\s+"(\d+?\.\d+?\.\d+)"/);
	if (!matches || matches.length < 1) throw new Error('Cannot get gradle version name');
	return matches[1];
}

async function main() {
	const projectName = 'joplin-android';
	const newContent = updateGradleConfig();
	const version = gradleVersionName(newContent);
	const tagName = 'android-v' + version;
	const apkFilename = 'joplin-v' + version + '.apk';
	const apkFilePath = releaseDir + '/' + apkFilename;
	const downloadUrl = 'https://github.com/laurent22/' + projectName + '/releases/download/' + tagName + '/' + apkFilename;

	process.chdir(rootDir);

	console.info('Running from: ' + process.cwd());

	console.info('Building APK file...');
	const output = await execCommand('/mnt/c/Windows/System32/cmd.exe /c "cd ReactNativeClient\\android && gradlew.bat assembleRelease -PbuildDir=build --console plain"');
	console.info(output);

	await fs.mkdirp(releaseDir);

	console.info('Copying APK to ' + apkFilePath);
	await fs.copy('ReactNativeClient/android/app/build/outputs/apk/release/app-release.apk', apkFilePath);

	console.info('Updating Readme URL...');

	let readmeContent = await fs.readFile('README.md', 'utf8');
	readmeContent = readmeContent.replace(/(https:\/\/github.com\/laurent22\/joplin-android\/releases\/download\/.*?\.apk)/, downloadUrl);
	await fs.writeFile('README.md', readmeContent);

	console.info(await execCommand('git pull'));
	console.info(await execCommand('git add -A'));
	console.info(await execCommand('git commit -m "Android release v' + version + '"'));
	console.info(await execCommand('git tag ' + tagName));
	console.info(await execCommand('git push'));
	console.info(await execCommand('git push --tags'));

	console.info('Creating GitHub release ' + tagName + '...');

	const release = await githubRelease(projectName, tagName, false);
	const uploadUrlTemplate = uriTemplate.parse(release.upload_url);
	const uploadUrl = uploadUrlTemplate.expand({ name: apkFilename });

	const binaryBody = await fs.readFile(apkFilePath);

	const oauthToken = await githubOauthToken();

	console.info('Uploading ' + apkFilename + ' to ' + uploadUrl);

	const uploadResponse = await fetch(uploadUrl, {
		method: 'POST', 
		body: binaryBody,
		headers: {
			'Content-Type': 'application/vnd.android.package-archive',
			'Authorization': 'token ' + oauthToken,
			'Content-Length': binaryBody.length,
		},
	});

	const uploadResponseText = await uploadResponse.text();
	console.info(uploadResponseText);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});