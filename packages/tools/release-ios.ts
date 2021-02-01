import * as fs from 'fs-extra';
import { execCommand2, rootDir, gitPullTry } from './tool-utils';

const mobileDir = `${rootDir}/packages/app-mobile`;

async function updateCodeProjVersions(filePath: string) {
	const originalContent = await fs.readFile(filePath, 'utf8');
	let newContent = originalContent;
	let newVersion = '';

	// MARKETING_VERSION = 10.1.0;
	newContent = newContent.replace(/(MARKETING_VERSION = )(\d+\.\d+)\.(\d+)(.*)/g, function(_match, prefix, majorMinorVersion, buildNum, suffix) {
		const n = Number(buildNum);
		if (isNaN(n)) throw new Error(`Invalid version code: ${buildNum}`);
		newVersion = `${majorMinorVersion}.${n + 1}`;
		return `${prefix}${newVersion}${suffix}`;
	});

	// CURRENT_PROJECT_VERSION = 58;
	newContent = newContent.replace(/(CURRENT_PROJECT_VERSION = )(\d+)(.*)/g, function(_match, prefix, projectVersion, suffix) {
		const n = Number(projectVersion);
		if (isNaN(n)) throw new Error(`Invalid version code: ${projectVersion}`);
		return `${prefix}${n + 1}${suffix}`;
	});

	if (!newVersion) throw new Error('Could not determine new version');
	if (newContent === originalContent) throw new Error('No change was made to project file');

	await fs.writeFile(filePath, newContent, 'utf8');

	return newVersion;
}

async function main() {
	await gitPullTry();

	console.info('Updating version numbers...');

	const newVersion = await updateCodeProjVersions(`${mobileDir}/ios/Joplin.xcodeproj/project.pbxproj`);
	console.info(`New version: ${newVersion}`);

	const tagName = `ios-v${newVersion}`;
	await execCommand2('git add -A');
	await execCommand2(`git commit -m "${tagName}"`);
	await execCommand2(`git tag ${tagName}`);
	await execCommand2('git push');
	await execCommand2('git push --tags');

	console.info(`To create changelog: node packages/tools/git-changelog.js ${tagName}`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
