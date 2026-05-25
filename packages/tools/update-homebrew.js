import { execCommand, downloadFile, fileSha256, unlinkForce } from './tool-utils.js';
'use strict';

// https://github.com/Homebrew/homebrew-core/blob/master/CONTRIBUTING.md

const rootDir = `${__dirname}/..`;

async function main() {
	const url = await execCommand('yarn view joplin dist.tarball');
	const targetPath = `${rootDir}/latest-cli.tar.gz`;
	await unlinkForce(targetPath);
	await downloadFile(url, targetPath);
	const sha256 = await fileSha256(targetPath);
	await unlinkForce(targetPath);

	console.info(`URL = ${url}`);
	console.info(`SHA256 = ${sha256}`);
	console.info('');
	console.info(`brew update && brew bump-formula-pr --strict joplin --url=${url} --sha256=${sha256}`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
});
