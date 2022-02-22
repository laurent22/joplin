import { execCommand2, rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	await gitPullTry();

	process.chdir(serverDir);
	const version = (await execCommand2('npm version patch')).trim();
	const versionSuffix = ''; // isPreRelease ? '-beta' : '';
	const tagName = `cloud-${version}${versionSuffix}`;

	const changelogPath = `${rootDir}/readme/changelog_cloud.md`;

	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Cloud', false, 'https://github.com/laurent22/joplin-private/releases/tag');
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
