import { execCommand2, rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	const argv = require('yargs').argv;
	if (!['release', 'prerelease'].includes(argv.type)) throw new Error('Must specify release type. Either --type=release or --type=prerelease');
	const isPreRelease = argv.type === 'prerelease';

	await gitPullTry();

	process.chdir(serverDir);
	const version = (await execCommand2('npm version patch')).trim();
	const versionShort = version.substr(1);
	const imageVersion = versionShort + (isPreRelease ? '-beta' : '');
	const tagName = `server-${version}`;

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	await execCommand2(`docker build -t "joplin/server:${imageVersion}" -f Dockerfile.server .`);
	await execCommand2(`docker tag "joplin/server:${imageVersion}" "joplin/server:latest"`);
	await execCommand2(`docker push joplin/server:${imageVersion}`);

	if (!isPreRelease) await execCommand2('docker push joplin/server:latest');

	const changelogPath = `${rootDir}/readme/changelog_server.md`;
	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Server', isPreRelease);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
