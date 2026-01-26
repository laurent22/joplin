import { execCommand } from '@joplin/utils';
import { copy, mkdirp, move, readFile, readFileSync, remove, stat, writeFile, writeFileSync } from 'fs-extra';
import { execCommandVerbose, execCommandWithPipes, githubRelease, githubOauthToken, fileExists, gitPullTry, completeReleaseWithChangelog } from './tool-utils';
import { homedir } from 'os';
const path = require('path');
const fetch = require('node-fetch');
const uriTemplate = require('uri-template');

const rootDir = path.dirname(path.dirname(__dirname));
const rnDir = `${rootDir}/packages/app-mobile`;
const releaseDir = `${rnDir}/dist`;

interface Release {
	downloadUrl: string;
	apkFilename: string;
	apkFilePath: string;
	publish: boolean;
}

type PatcherCallback = (content: string)=> Promise<string>;

class Patcher {

	private workDir_: string;
	private originalContents_: Record<string, string> = {};
	private removedFiles_: Record<string, string> = {};

	public constructor(workDir: string) {
		this.workDir_ = workDir;
	}

	public removeFile = async (path: string) => {
		const targetPath = `${this.workDir_}/${path.substring(1)}`;
		await move(path, targetPath);
		this.removedFiles_[path] = targetPath;
	};

	public updateFileContent = async (path: string, callback: PatcherCallback) => {
		const content = await readFile(path, 'utf8');
		this.originalContents_[path] = content;
		const newContent = await callback(content);
		await writeFile(path, newContent);
	};

	public restore = async () => {
		for (const filename in this.originalContents_) {
			const content = this.originalContents_[filename];
			await writeFile(filename, content);
		}

		for (const [originalPath, backupPath] of Object.entries(this.removedFiles_)) {
			await move(backupPath, originalPath);
		}

		this.removedFiles_ = {};
		this.originalContents_ = {};
	};

}

interface ReleaseConfig {
	name: string;
	patch?: (patcher: Patcher, rootDir: string)=> Promise<void>;
	disabled?: boolean;
	publish: boolean;
}

function increaseGradleVersionCode(content: string) {
	const newContent = content.replace(/versionCode\s+(\d+)/, (_a, versionCode: string) => {
		const n = Number(versionCode);
		if (isNaN(n) || !n) throw new Error(`Invalid version code: ${versionCode}`);
		return `versionCode ${n + 1}`;
	});

	if (newContent === content) throw new Error('Could not update version code');

	return newContent;
}

function increaseGradleVersionName(content: string) {
	const newContent = content.replace(/(versionName\s+"\d+?\.\d+?\.)(\d+)"/, (_match, prefix: string, buildNum: string) => {
		const n = Number(buildNum);
		if (isNaN(n)) throw new Error(`Invalid version code: ${buildNum}`);
		return `${prefix + (n + 1)}"`;
	});

	if (newContent === content) throw new Error('Could not update version name');

	return newContent;
}

function updateGradleConfig() {
	let content = readFileSync(`${rnDir}/android/app/build.gradle`, 'utf8');
	content = increaseGradleVersionCode(content);
	content = increaseGradleVersionName(content);
	writeFileSync(`${rnDir}/android/app/build.gradle`, content);
	return content;
}

function gradleVersionName(content: string) {
	const matches = content.match(/versionName\s+"(\d+?\.\d+?\.\d+)"/);
	if (!matches || matches.length < 1) throw new Error('Cannot get gradle version name');
	return matches[1];
}

async function createRelease(projectName: string, releaseConfig: ReleaseConfig, tagName: string, version: string, publish: boolean): Promise<Release> {
	const name = releaseConfig.name;
	const suffix = version + (name === 'main' ? '' : `-${name}`);

	const patcher = new Patcher(`${rnDir}/patcher-work`);

	console.info(`Creating release: ${suffix}`);

	process.chdir(rootDir);

	console.info(`Running from: ${process.cwd()}`);

	if (releaseConfig.patch) await releaseConfig.patch(patcher, rootDir);

	const apkFilename = `joplin-v${suffix}.apk`;
	const apkFilePath = `${releaseDir}/${apkFilename}`;
	const downloadUrl = `https://github.com/laurent22/${projectName}/releases/download/${tagName}/${apkFilename}`;

	await execCommand('yarn install', { showStdout: false });
	await execCommand('yarn tsc', { showStdout: false });
	await execCommand('yarn buildParallel', { showStdout: false });

	console.info(`Building APK file v${suffix}...`);

	// Normally we should build in the `build-main` folder but it seems Expo has a hard-coded path
	// to `build` and fail with this error:
	//
	// A problem occurred evaluating project ':app'
	// > /Users/laurent/src/joplin-new/packages/app-mobile/android/build-main/generated/autolinking/autolinking.json
	// > (No such file or directory)
	const buildDirName = 'build'; // name === 'main' ? 'build' : `build-${name}`;
	const buildDirBasePath = `${rnDir}/android/app/${buildDirName}`;
	await remove(buildDirBasePath);

	let restoreDir = null;
	let apkBuildCmd = '';
	let apkCleanBuild = '';
	const apkBuildCmdArgs = ['assembleRelease', `-PbuildDir=${buildDirName}`];
	if (await fileExists('/mnt/c/Windows/System32/cmd.exe')) {
		await execCommandWithPipes('/mnt/c/Windows/System32/cmd.exe', ['/c', `cd packages\\app-mobile\\android && gradlew.bat ${apkBuildCmd}`]);
		apkBuildCmd = '';
		throw new Error('TODO: apkCleanBuild must be set');
	} else {
		process.chdir(`${rnDir}/android`);
		apkBuildCmd = './gradlew';
		apkCleanBuild = `./gradlew clean -PbuildDir=${buildDirName}`;
		restoreDir = rootDir;
	}

	if (apkBuildCmd) {
		await execCommand(apkCleanBuild);
		await execCommandVerbose(apkBuildCmd, apkBuildCmdArgs);
	}

	if (restoreDir) process.chdir(restoreDir);

	await mkdirp(releaseDir);

	const builtApk = `${buildDirBasePath}/outputs/apk/release/app-release.apk`;
	const builtApkStat = await stat(builtApk);

	console.info(`Built APK at ${builtApk}`);
	console.info('APK size:', builtApkStat.size);

	console.info(`Copying APK to ${apkFilePath}`);
	await copy(builtApk, apkFilePath);

	if (name === 'main') {
		console.info(`Copying APK to ${releaseDir}/joplin-latest.apk`);
		await copy(builtApk, `${releaseDir}/joplin-latest.apk`);
	}

	await patcher.restore();

	return {
		downloadUrl: publish ? downloadUrl : '',
		apkFilename: apkFilename,
		apkFilePath: apkFilePath,
		publish,
	};
}

const uploadToGitHubRelease = async (projectName: string, tagName: string, isPreRelease: boolean, releaseFiles: Record<string, Release>) => {
	const allPublishDisabled = Object.values(releaseFiles).every(r => !r.publish);
	if (allPublishDisabled) {
		console.info('All release files have publishing disabled - skipping GitHub release creation');
		return;
	}

	console.info(`Creating GitHub release ${tagName}...`);

	const releaseOptions = { isPreRelease: isPreRelease };

	const oauthToken = await githubOauthToken();
	const release = await githubRelease(projectName, tagName, releaseOptions);
	const uploadUrlTemplate = uriTemplate.parse(release.upload_url);

	for (const releaseFilename in releaseFiles) {
		const releaseFile = releaseFiles[releaseFilename];
		if (!releaseFile.publish) {
			console.info(`Skipping: ${releaseFile.apkFilename} (publishing is disabled)`);
			continue;
		}

		const uploadUrl = uploadUrlTemplate.expand({ name: releaseFile.apkFilename });

		const binaryBody = await readFile(releaseFile.apkFilePath);

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
};

// const testPatch = async (releaseConfig:ReleaseConfig) => {
// 	const patcher = new Patcher(`${rnDir}/patcher-work`);
// 	await releaseConfig.patch(patcher, rootDir);
// 	process.exit();
// }

const releaseConfigs: ReleaseConfig[] = [
	{
		name: 'main',
		publish: true,
	},

	{
		name: 'custom',
		publish: false,
		patch: require(`${homedir()}/joplin-credentials/android-black-icon.js`),
	},

	{
		name: 'armeabi-v7a',
		disabled: true,
		publish: true,
		patch: async (patcher, rootDir) => {
			await patcher.updateFileContent(`${rootDir}/packages/app-mobile/android/app/build.gradle`, async (content: string) => {
				content = content.replace(/abiFilters "armeabi-v7a", "x86", "arm64-v8a", "x86_64"/, 'abiFilters "armeabi-v7a"');
				return content;
			});
		},
	},

	{
		name: 'x86',
		disabled: true,
		publish: true,
		patch: async (patcher, rootDir) => {
			await patcher.updateFileContent(`${rootDir}/packages/app-mobile/android/app/build.gradle`, async (content: string) => {
				content = content.replace(/abiFilters "armeabi-v7a", "x86", "arm64-v8a", "x86_64"/, 'abiFilters "x86"');
				return content;
			});
		},
	},

	{
		name: 'arm64-v8a',
		disabled: true,
		publish: true,
		patch: async (patcher, rootDir) => {
			await patcher.updateFileContent(`${rootDir}/packages/app-mobile/android/app/build.gradle`, async (content: string) => {
				content = content.replace(/abiFilters "armeabi-v7a", "x86", "arm64-v8a", "x86_64"/, 'abiFilters "arm64-v8a"');
				return content;
			});
		},
	},

	{
		name: 'x86_64',
		disabled: true,
		publish: true,
		patch: async (patcher, rootDir) => {
			await patcher.updateFileContent(`${rootDir}/packages/app-mobile/android/app/build.gradle`, async (content: string) => {
				content = content.replace(/abiFilters "armeabi-v7a", "x86", "arm64-v8a", "x86_64"/, 'abiFilters "x86_64"');
				return content;
			});
		},
	},
];

async function main() {
	const argv = require('yargs').argv;

	// await testPatch(releaseConfigs[1]);

	await gitPullTry(false);

	const isPreRelease = !('type' in argv) || argv.type === 'prerelease';
	const releaseNameOnly = argv['release-name'];

	process.chdir(rnDir);

	if (isPreRelease) console.info('Creating pre-release');
	console.info('Updating version numbers in build.gradle...');

	const newContent = updateGradleConfig();
	const version = gradleVersionName(newContent);
	const tagName = `android-v${version}`;

	const releaseFiles: Record<string, Release> = {};
	const mainProjectName = 'joplin-android';

	for (const releaseConfig of releaseConfigs) {
		if (releaseNameOnly && releaseConfig.name !== releaseNameOnly) continue;
		if (releaseConfig.disabled) continue;
		releaseFiles[releaseConfig.name] = await createRelease(mainProjectName, releaseConfig, tagName, version, releaseConfig.publish);
	}

	console.info('Created releases:');
	console.info(releaseFiles);

	await uploadToGitHubRelease(mainProjectName, tagName, isPreRelease, releaseFiles);

	if (releaseFiles['main']) console.info(`Main download URL: ${releaseFiles['main'].downloadUrl}`);

	const changelogPath = `${rootDir}/readme/about/changelog/android.md`;

	// When creating the changelog, we always set `isPrerelease` to `false` - this is because we
	// only ever publish pre-releases, and it's only later that we manually promote some of them to
	// stable releases. So having "(Pre-release)" for each Android version in the changelog is
	// meaningless and would be incorrect for the versions that are stable ones.
	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Android', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
