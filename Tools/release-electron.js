const { execCommand, githubRelease } = require('./tool-utils.js');
const path = require('path');

const rootDir = path.dirname(__dirname);
const appDir = `${rootDir}/ElectronClient`;

async function main() {
	const argv = require('yargs').argv;

	process.chdir(appDir);

	console.info(`Running from: ${process.cwd()}`);

	const version = (await execCommand('npm version patch')).trim();
	const tagName = version;

	console.info(`New version number: ${version}`);

	console.info(await execCommand('git add -A'));
	console.info(await execCommand(`git commit -m "Electron release ${version}"`));
	console.info(await execCommand(`git tag ${tagName}`));
	console.info(await execCommand('git push && git push --tags'));

	const releaseOptions = { isDraft: true, isPreRelease: !!argv.beta };

	console.info('Release options: ', releaseOptions);

	const release = await githubRelease('joplin', tagName, releaseOptions);

	console.info(`Created GitHub release: ${release.html_url}`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
