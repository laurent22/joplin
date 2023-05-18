import { execCommand } from '@joplin/utils';
import { rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	// const argv = require('yargs').argv;
	// if (!['release', 'prerelease'].includes(argv.type)) throw new Error('Must specify release type. Either --type=release or --type=prerelease');
	// const isPreRelease = argv.type === 'prerelease';

	// const isPreRelease = false;

	await gitPullTry();

	process.chdir(serverDir);
	const version = (await execCommand('npm version patch')).trim();
	const versionSuffix = ''; // isPreRelease ? '-beta' : '';
	const tagName = `server-${version}${versionSuffix}`;

	const changelogPath = `${rootDir}/readme/changelog_server.md`;

	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Server', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
