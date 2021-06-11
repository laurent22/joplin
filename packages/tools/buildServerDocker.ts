import { execCommand2, rootDir } from './tool-utils';

function getVersionFromTag(tagName: string): string {
	if (tagName.indexOf('server-') !== 0) throw new Error(`Invalid tag: ${tagName}`);
	const s = tagName.split('-');
	return s[1].substr(1);
}

function getIsPreRelease(tagName: string): boolean {
	return tagName.indexOf('-beta') > 0;
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv.tagName) throw new Error('--tag-name not provided');

	const tagName = argv.tagName;
	const imageVersion = getVersionFromTag(tagName);
	const isPreRelease = getIsPreRelease(tagName);

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	console.info('tagName:', tagName);
	console.info('imageVersion:', imageVersion);
	console.info('isPreRelease:', isPreRelease);

	await execCommand2(`docker build -t "joplin/server:${imageVersion}" -f Dockerfile.server .`);
	await execCommand2(`docker tag "joplin/server:${imageVersion}" "joplin/server:latest"`);
	await execCommand2(`docker push joplin/server:${imageVersion}`);

	if (!isPreRelease) await execCommand2('docker push joplin/server:latest');
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
