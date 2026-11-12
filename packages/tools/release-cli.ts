import { execCommand } from '@joplin/utils';
import { rootDir, completeReleaseWithChangelog } from './tool-utils';
import { versionPatch } from '@joplin/utils/version';
import { versionAll } from './releaseSubPackages';

const appDir = `${rootDir}/packages/app-cli`;
const changelogPath = `${rootDir}/readme/about/changelog/cli.md`;

// Start with node Tools/release-cli.js --changelog-from cli-v1.0.126
// to specify from where the changelog should be created
//
// Pushing the tag triggers the publish-sub-packages workflow, which publishes the libraries, then the app.
async function main() {
	process.chdir(rootDir);

	await execCommand('git pull');

	await versionAll();

	process.chdir(appDir);
	const newVersion = await versionPatch();
	console.info(`New version: ${newVersion}`);
	const newTag = `cli-${newVersion}`;

	process.chdir(rootDir);
	await execCommand('yarn install --mode=update-lockfile');

	await completeReleaseWithChangelog(changelogPath, newVersion, newTag, 'CLI', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	console.error('');
	console.error('If the app cannot auto-detect the previous tag name, specify it using --changelog-from TAG_NAME');
	process.exit(1);
});
