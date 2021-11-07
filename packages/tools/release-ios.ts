import * as fs from 'fs-extra';
import { execCommand2, rootDir, gitPullTry } from './tool-utils';

const mobileDir = `${rootDir}/packages/app-mobile`;

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
		newVersionId = n + 1;
		return `${prefix}${newVersionId}${suffix}`;
	});

	if (!newVersion) throw new Error('Could not determine new version');
	if (newContent === originalContent) throw new Error('No change was made to project file');

	await fs.writeFile(filePath, newContent, 'utf8');

	return { newVersion, newVersionId };
}

async function main() {
	await gitPullTry();

	console.info('Updating version numbers...');

	const { newVersion, newVersionId } = await updateCodeProjVersions(`${mobileDir}/ios/Joplin.xcodeproj/project.pbxproj`);
	console.info(`New version: ${newVersion} (${newVersionId})`);

	const tagName = `ios-v${newVersion}`;
	console.info(`Tag name: ${tagName}`);

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
