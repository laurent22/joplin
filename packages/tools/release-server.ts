import { execCommand2, rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	const argv = require('yargs').argv;
	if (!['release', 'prerelease'].includes(argv.type)) throw new Error('Must specify release type. Either --type=release or --type=prerelease');
	const isPreRelease = argv.type === 'prerelease';

	await gitPullTry();

	process.chdir(serverDir);
	const version = (await execCommand2('npm version patch')).trim();
	const versionSuffix = isPreRelease ? '-beta' : '';
	const tagName = `server-${version}${versionSuffix}`;

	const changelogPath = `${rootDir}/readme/changelog_server.md`;

	// We don't mark the changelog entry as pre-release because they all are
	// initially. It's only after a number of days once it's clear that the
	// release is stable that it is marked as "latest".
	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Server', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
