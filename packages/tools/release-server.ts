import { rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';
import { yarnVersionPatch } from '@joplin/utils/version';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	await gitPullTry();

	process.chdir(serverDir);
	const version = await yarnVersionPatch();
	const versionSuffix = '';
	const tagName = `server-${version}${versionSuffix}`;

	const changelogPath = `${rootDir}/readme/about/changelog/server.md`;

	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Server', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
