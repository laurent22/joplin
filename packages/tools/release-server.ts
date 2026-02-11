import { rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';
import { versionPatch } from '@joplin/utils/version';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	await gitPullTry();

	process.chdir(serverDir);
	const version = await versionPatch();
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
