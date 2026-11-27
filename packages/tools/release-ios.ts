import * as fs from 'fs-extra';
import { rootDir, gitPullTry, completeReleaseWithChangelog, execCommandWithPipes } from './tool-utils';
import { unique } from '@joplin/lib/ArrayUtils';
import { credentialFile, readCredentialFileJson } from '@joplin/lib/utils/credentialFiles';
import * as readline from 'readline';

const mobileDir = `${rootDir}/packages/app-mobile`;

const warningMessage = async () => {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log('IMPORTANT: Before releasing the iOS app, run `yarn install && yarn buildParallel`. Press Ctrl+C if it has not been done. Press Enter to continue...');

		rl.on('line', () => {
			rl.close();
			resolve(null);
		});
	});
};

// Note that it will update all the MARKETING_VERSION and
// CURRENT_PROJECT_VERSION fields, including for extensions (such as the
// ShareExtension), which is normally what we want.
// https://github.com/laurent22/joplin/pull/4963
async function updateCodeProjVersions(filePath: string) {
	const originalContent = await fs.readFile(filePath, 'utf8');
	let newContent = originalContent;
	let newVersion = '';
	let newVersionId = 0;

	// MARKETING_VERSION = 10.1.0;
	newContent = newContent.replace(/(MARKETING_VERSION = )(\d+\.\d+)\.(\d+)(.*)/g, (_match, prefix, majorMinorVersion, buildNum, suffix) => {
		const n = Number(buildNum);
		if (isNaN(n)) throw new Error(`Invalid version code: ${buildNum}`);
		newVersion = `${majorMinorVersion}.${n + 1}`;
		return `${prefix}${newVersion}${suffix}`;
	});

	// CURRENT_PROJECT_VERSION = 58;
	newContent = newContent.replace(/(CURRENT_PROJECT_VERSION = )(\d+)(.*)/g, (_match, prefix, projectVersion, suffix) => {
		const n = Number(projectVersion);
		if (isNaN(n)) throw new Error(`Invalid version code: ${projectVersion}`);
		newVersionId = n + 1;
		return `${prefix}${newVersionId}${suffix}`;
	});

	if (!newVersion) throw new Error('Could not determine new version');
	if (newContent === originalContent) throw new Error('No change was made to project file');

	await fs.writeFile(filePath, newContent, 'utf8');

	return { newVersion, newVersionId };
}

// Check that deployment targets of all projects match
// IPHONEOS_DEPLOYMENT_TARGET
// If they don't we get this kind of error:
// https://github.com/laurent22/joplin/issues/4945#issuecomment-995802706
async function checkDeploymentTargets(filePath: string) {
	const content = await fs.readFile(filePath, 'utf8');

	// Only check the app targets - the test target (which sets TEST_TARGET_NAME)
	// is allowed to have a different deployment target.
	const blockRe = /isa = XCBuildConfiguration;([\s\S]*?)\n\t\t\t\};/g;
	const targetRe = /IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+)/;
	let versions: string[] = [];
	let block = blockRe.exec(content);
	while (block) {
		const blockContent = block[1];
		const targetMatch = targetRe.exec(blockContent);
		if (targetMatch && !/TEST_TARGET_NAME = /.test(blockContent)) {
			versions.push(targetMatch[1]);
		}
		block = blockRe.exec(content);
	}

	versions = unique(versions);

	if (versions.length > 1) throw new Error(`Detected mismatched IPHONEOS_DEPLOYMENT_TARGET: ${versions.join(', ')}. Set them all to the same target. In ${filePath}`);
	if (!versions.length) throw new Error(`Could not find IPHONEOS_DEPLOYMENT_TARGET in ${filePath}`);
}

interface AppStoreConnectKey {
	keyId: string;
	issuerId: string;
}

// Xcode's Apple ID login periodically expires, and xcodebuild then fails instead of prompting to
// sign in again, so prefer an App Store Connect API key when one is available.
const authenticationArgs = () => {
	const key = readCredentialFileJson<AppStoreConnectKey>('app-store-connect.json');
	if (!key) {
		console.info('No app-store-connect.json credential file - using the Apple ID signed in to Xcode');
		return [];
	}

	return [
		'-authenticationKeyPath', credentialFile(`AuthKey_${key.keyId}.p8`),
		'-authenticationKeyID', key.keyId,
		'-authenticationKeyIssuerID', key.issuerId,
	];
};

const archiveAndUpload = async () => {
	const iosDir = `${mobileDir}/ios`;
	const authArgs = authenticationArgs();
	const buildDir = `${iosDir}/build/release`;
	const archivePath = `${buildDir}/Joplin.xcarchive`;

	await fs.remove(buildDir);

	// Xcode's /usr/bin/rsync spawns whichever `rsync` is first in PATH as its server side. If that's
	// Homebrew's rsync 3.x, it rejects Apple's flags and the export fails with "Copy failed".
	process.env.PATH = `/usr/bin:${process.env.PATH}`;

	console.info('Archiving...');
	await execCommandWithPipes('xcodebuild', [
		'archive',
		'-quiet',
		'-workspace', `${iosDir}/Joplin.xcworkspace`,
		'-scheme', 'Joplin',
		'-configuration', 'Release',
		'-destination', 'generic/platform=iOS',
		'-archivePath', archivePath,
		'-allowProvisioningUpdates',
		...authArgs,
	]);

	// ExportOptions.plist has "destination: upload", so this sends the build to App Store Connect
	console.info('Uploading to App Store Connect...');
	await execCommandWithPipes('xcodebuild', [
		'-exportArchive',
		'-archivePath', archivePath,
		'-exportOptionsPlist', `${iosDir}/ExportOptions.plist`,
		'-exportPath', `${buildDir}/export`,
		'-allowProvisioningUpdates',
		...authArgs,
	]);
};

async function main() {
	const argv = require('yargs').argv;

	await gitPullTry();

	await warningMessage();

	// React Native caches a path to Node in there, which appears to point to a copy of the
	// executable in a temp folder. If those temp folders are deleted it will still try to use that
	// path and fail. Running "Clean build" won't remove `.xcode.env.local` so it's safer to always
	// delete it, since if there's an issue the error makes no sense whatsoever, and several hours
	// will be lost trying to fix the issue.
	await fs.remove(`${mobileDir}/ios/Pods/../.xcode.env.local`);

	const pbxprojFilePath = `${mobileDir}/ios/Joplin.xcodeproj/project.pbxproj`;
	await checkDeploymentTargets(pbxprojFilePath);

	console.info('Updating version numbers...');

	const { newVersion, newVersionId } = await updateCodeProjVersions(pbxprojFilePath);
	console.info(`New version: ${newVersion} (${newVersionId})`);

	if (argv.upload) await archiveAndUpload();

	const tagName = `ios-v${newVersion}`;
	console.info(`Tag name: ${tagName}`);

	const changelogPath = `${rootDir}/readme/about/changelog/ios.md`;
	await completeReleaseWithChangelog(changelogPath, newVersion, tagName, 'iOS', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
