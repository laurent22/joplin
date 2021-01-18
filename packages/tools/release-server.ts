import { execCommand2, rootDir, gitPullTry } from './tool-utils';

const serverDir = `${rootDir}/packages/server`;

async function main() {
	await gitPullTry();

	process.chdir(serverDir);
	const version = (await execCommand2('npm version patch')).trim();
	const versionShort = version.substr(1);
	const tagName = `server-${version}`;

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	await execCommand2(`docker build -t "joplin/server:${versionShort}" -f Dockerfile.server .`);
	await execCommand2(`docker tag "joplin/server:${versionShort}" "joplin/server:latest"`);
	await execCommand2(`docker push joplin/server:${versionShort}`);
	await execCommand2('docker push joplin/server:latest');

	await execCommand2('git add -A');
	await execCommand2(`git commit -m 'Server release ${version}'`);
	await execCommand2(`git tag ${tagName}`);
	await execCommand2('git push');
	await execCommand2('git push --tags');
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
