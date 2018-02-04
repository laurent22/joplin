const fs = require('fs-extra');
const { execCommand, githubRelease, handleCommitHook } = require('./tool-utils.js');
const path = require('path');
const fetch = require('node-fetch');
const uriTemplate = require('uri-template');

const rootDir = path.dirname(__dirname);
const appDir = rootDir + '/ElectronClient/app';

async function main() {
	const oauthToken = await githubOauthToken();
	process.chdir(appDir);

	console.info('Running from: ' + process.cwd());

	const version = (await execCommand('npm version patch')).trim();
	const tagName = version;

	console.info('New version number: ' + version);

	console.info(await execCommand('git add -A'));
	console.info(await execCommand('git commit -m "Electron release ' + version + '"'));
	await handleCommitHook();
	console.info(await execCommand('git tag ' + tagName));
	console.info(await execCommand('git push && git push --tags'));

	const release = await githubRelease(tagName, true);

	console.info('Created GitHub release: ' + release.url);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
});