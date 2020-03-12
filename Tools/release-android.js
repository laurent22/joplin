const fs = require('fs-extra');
const { execCommand, execCommandWithPipes, githubRelease, githubOauthToken, fileExists } = require('./tool-utils.js');
const path = require('path');
const fetch = require('node-fetch');
const uriTemplate = require('uri-template');

const projectName = 'joplin-android';
const rnDir = `${__dirname}/../ReactNativeClient`;
const rootDir = path.dirname(__dirname);
const releaseDir = `${rootDir}/_releases`;

// function wslToWinPath(wslPath) {
// 	const s = wslPath.split('/');
// 	if (s.length < 3) return s.join('\\');
// 	s.splice(0, 1);
// 	if (s[0] !== 'mnt' || s[1].length !== 1) return s.join('\\');
// 	s.splice(0, 1);
// 	s[0] = `${s[0].toUpperCase()}:`;
// 	while (s.length && !s[s.length - 1]) s.pop();
// 	return s.join('\\');
// }

function increaseGradleVersionCode(content) {
	const newContent = content.replace(/versionCode\s+(\d+)/, function(a, versionCode) {
		const n = Number(versionCode);
		if (isNaN(n) || !n) throw new Error(`Invalid version code: ${versionCode}`);
		return `versionCode ${n + 1}`;
	});

	if (newContent === content) throw new Error('Could not update version code');

	return newContent;
}

function increaseGradleVersionName(content) {
	const newContent = content.replace(/(versionName\s+"\d+?\.\d+?\.)(\d+)"/, function(match, prefix, buildNum) {
		const n = Number(buildNum);
		if (isNaN(n) || !n) throw new Error(`Invalid version code: ${buildNum}`);
		return `${prefix + (n + 1)}"`;
	});

	if (newContent === content) throw new Error('Could not update version name');

	return newContent;
}

function updateGradleConfig() {
	let content = fs.readFileSync(`${rnDir}/android/app/build.gradle`, 'utf8');
	content = increaseGradleVersionCode(content);
	content = increaseGradleVersionName(content);
	fs.writeFileSync(`${rnDir}/android/app/build.gradle`, content);
	return content;
}

function gradleVersionName(content) {
	const matches = content.match(/versionName\s+"(\d+?\.\d+?\.\d+)"/);
	if (!matches || matches.length < 1) throw new Error('Cannot get gradle version name');
	return matches[1];
}

async function createRelease(name, tagName, version, rcSuffix) {
	const originalContents = {};
	const suffix = version + rcSuffix + (name === 'main' ? '' : `-${name}`);

	console.info(`Creating release: ${suffix}`);

	if (name === '32bit') {
		let filename = `${rnDir}/android/app/build.gradle`;
		let content = await fs.readFile(filename, 'utf8');
		originalContents[filename] = content;
		content = content.replace(/abiFilters "armeabi-v7a", "x86", "arm64-v8a", "x86_64"/, 'abiFilters "armeabi-v7a", "x86"');
		content = content.replace(/include "armeabi-v7a", "x86", "arm64-v8a", "x86_64"/, 'include "armeabi-v7a", "x86"');
		await fs.writeFile(filename, content);
	}

	const apkFilename = `joplin-v${suffix}.apk`;
	const apkFilePath = `${releaseDir}/${apkFilename}`;
	const downloadUrl = `https://github.com/laurent22/${projectName}/releases/download/${tagName}/${apkFilename}`;

	process.chdir(rootDir);

	console.info(`Running from: ${process.cwd()}`);

	console.info(`Building APK file v${suffix}...`);

	let restoreDir = null;
	let apkBuildCmd = 'assembleRelease -PbuildDir=build';
	if (await fileExists('/mnt/c/Windows/System32/cmd.exe')) {
		// In recent versions (of Gradle? React Native?), running gradlew.bat from WSL throws the following error:

		//     Error: Command failed: /mnt/c/Windows/System32/cmd.exe /c "cd ReactNativeClient\android && gradlew.bat assembleRelease -PbuildDir=build"

		//     FAILURE: Build failed with an exception.

		//     * What went wrong:
		//     Could not determine if Stdout is a console: could not get handle file information (errno 1)

		// So we need to manually run the command from DOS, and then coming back here to finish the process once it's done.

		// console.info('Run this command from DOS:');
		// console.info('');
		// console.info(`cd "${wslToWinPath(rootDir)}\\ReactNativeClient\\android" && gradlew.bat ${apkBuildCmd}"`);
		// console.info('');
		// await readline('Press Enter when done:');
		// apkBuildCmd = ''; // Clear the command because we've already ran it

		// process.chdir(`${rnDir}/android`);
		// apkBuildCmd = `/mnt/c/Windows/System32/cmd.exe /c "cd ReactNativeClient\\android && gradlew.bat ${apkBuildCmd}"`;
		// restoreDir = rootDir;

		// apkBuildCmd = `/mnt/c/Windows/System32/cmd.exe /c "cd ReactNativeClient\\android && gradlew.bat ${apkBuildCmd}"`;

		await execCommandWithPipes('/mnt/c/Windows/System32/cmd.exe', ['/c', `cd ReactNativeClient\\android && gradlew.bat ${apkBuildCmd}`]);
		apkBuildCmd = '';
	} else {
		process.chdir(`${rnDir}/android`);
		apkBuildCmd = `./gradlew ${apkBuildCmd}`;
		restoreDir = rootDir;
	}

	if (apkBuildCmd) {
		console.info(apkBuildCmd);
		const output = await execCommand(apkBuildCmd);
		console.info(output);
	}

	if (restoreDir) process.chdir(restoreDir);

	await fs.mkdirp(releaseDir);

	console.info(`Copying APK to ${apkFilePath}`);
	await fs.copy('ReactNativeClient/android/app/build/outputs/apk/release/app-release.apk', apkFilePath);

	if (name === 'main') {
		console.info(`Copying APK to ${releaseDir}/joplin-latest.apk`);
		await fs.copy('ReactNativeClient/android/app/build/outputs/apk/release/app-release.apk', `${releaseDir}/joplin-latest.apk`);
	}

	for (let filename in originalContents) {
		const content = originalContents[filename];
		await fs.writeFile(filename, content);
	}

	return {
		downloadUrl: downloadUrl,
		apkFilename: apkFilename,
		apkFilePath: apkFilePath,
	};
}

async function main() {
	const argv = require('yargs').argv;

	const rcSuffix = argv.rc ? `-${argv.rc}` : '';

	if (rcSuffix) console.info(`Creating release candidate ${argv.rc}`);
	console.info('Updating version numbers in build.gradle...');

	const newContent = updateGradleConfig();
	const version = gradleVersionName(newContent);
	const tagName = `android-v${version}${rcSuffix}`;
	const releaseNames = ['main', '32bit'];
	const releaseFiles = {};

	for (const releaseName of releaseNames) {
		releaseFiles[releaseName] = await createRelease(releaseName, tagName, version, rcSuffix);
	}

	if (!rcSuffix) {
		console.info('Updating Readme URL...');

		let readmeContent = await fs.readFile('README.md', 'utf8');
		readmeContent = readmeContent.replace(/(https:\/\/github.com\/laurent22\/joplin-android\/releases\/download\/android-v\d+\.\d+\.\d+\/joplin-v\d+\.\d+\.\d+\.apk)/, releaseFiles['main'].downloadUrl);
		readmeContent = readmeContent.replace(/(https:\/\/github.com\/laurent22\/joplin-android\/releases\/download\/android-v\d+\.\d+\.\d+\/joplin-v\d+\.\d+\.\d+-32bit\.apk)/, releaseFiles['32bit'].downloadUrl);
		await fs.writeFile('README.md', readmeContent);
	}

	console.info(await execCommand('git pull'));
	console.info(await execCommand('git add -A'));
	console.info(await execCommand(`git commit -m "Android release v${version}${rcSuffix}"`));
	console.info(await execCommand(`git tag ${tagName}`));
	console.info(await execCommand('git push'));
	console.info(await execCommand('git push --tags'));

	console.info(`Creating GitHub release ${tagName}...`);

	const oauthToken = await githubOauthToken();
	const release = await githubRelease(projectName, tagName);
	const uploadUrlTemplate = uriTemplate.parse(release.upload_url);

	for (const releaseFilename in releaseFiles) {
		const releaseFile = releaseFiles[releaseFilename];
		const uploadUrl = uploadUrlTemplate.expand({ name: releaseFile.apkFilename });

		const binaryBody = await fs.readFile(releaseFile.apkFilePath);

		console.info(`Uploading ${releaseFile.apkFilename} to ${uploadUrl}`);

		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			body: binaryBody,
			headers: {
				'Content-Type': 'application/vnd.android.package-archive',
				'Authorization': `token ${oauthToken}`,
				'Content-Length': binaryBody.length,
			},
		});

		const uploadResponseText = await uploadResponse.text();
		const uploadResponseObject = JSON.parse(uploadResponseText);
		if (!uploadResponseObject || !uploadResponseObject.browser_download_url) throw new Error('Could not upload file to GitHub');
	}

	console.info(`Main download URL: ${releaseFiles['main'].downloadUrl}`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
