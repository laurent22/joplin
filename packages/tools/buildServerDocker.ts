import { execCommand2, rootDir } from './tool-utils';
import * as moment from 'moment';

function getVersionFromTag(tagName: string, isPreRelease: boolean): string {
	if (tagName.indexOf('server-') !== 0) throw new Error(`Invalid tag: ${tagName}`);
	const s = tagName.split('-');
	const suffix = isPreRelease ? '-beta' : '';
	return s[1].substr(1) + suffix;
}

function getIsPreRelease(tagName: string): boolean {
	return tagName.indexOf('-beta') > 0;
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv.tagName) throw new Error('--tag-name not provided');

	const tagName = argv.tagName;
	const isPreRelease = getIsPreRelease(tagName);
	const imageVersion = getVersionFromTag(tagName, isPreRelease);
	const buildDate = moment(new Date().getTime()).format('YYYY-MM-DDTHH:mm:ssZ');
	let revision = '';
	try {
		revision = await execCommand2('git rev-parse --short HEAD', { showOutput: false });
	} catch (error) {
		console.info('Could not get git commit: metadata revision field will be empty');
	}
	const buildArgs = `--build-arg BUILD_DATE="${buildDate}" --build-arg REVISION="${revision}" --build-arg VERSION="${imageVersion}"`;

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	console.info('tagName:', tagName);
	console.info('imageVersion:', imageVersion);
	console.info('isPreRelease:', isPreRelease);

	await execCommand2(`docker build -t "joplin/server:${imageVersion}" ${buildArgs} -f Dockerfile.server .`);
	await execCommand2(`docker push joplin/server:${imageVersion}`);

	if (!isPreRelease) {
		await execCommand2(`docker tag "joplin/server:${imageVersion}" "joplin/server:latest"`);
		await execCommand2('docker push joplin/server:latest');
	}
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
