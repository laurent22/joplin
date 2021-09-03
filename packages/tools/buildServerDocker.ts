import { execCommand2, rootDir } from './tool-utils';
import * as moment from 'moment';

const DockerImageName = 'joplin/server';

function getVersionFromTag(tagName: string, isPreRelease: boolean): string {
	if (tagName.indexOf('server-') !== 0) throw new Error(`Invalid tag: ${tagName}`);
	const s = tagName.split('-');
	const suffix = isPreRelease ? '-beta' : '';
	return s[1].substr(1) + suffix;
}

function getIsPreRelease(tagName: string): boolean {
	return tagName.indexOf('-beta') > 0;
}

function normalizePlatform(platform: string) {
	return platform.replace(/\//g, '-');
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv.tagName) throw new Error('--tag-name not provided');

	const pushImages = !!argv.pushImages;
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
	const buildArgs = [
		`--build-arg BUILD_DATE="${buildDate}"`,
		`--build-arg REVISION="${revision}"`,
		`--build-arg VERSION="${imageVersion}"`,
	];
	const dockerTags: string[] = [];
	const versionPart = imageVersion.split('.');
	dockerTags.push(isPreRelease ? 'beta' : 'latest');
	dockerTags.push(versionPart[0] + (isPreRelease ? '-beta' : ''));
	dockerTags.push(`${versionPart[0]}.${versionPart[1]}${isPreRelease ? '-beta' : ''}`);
	dockerTags.push(imageVersion);

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	console.info('tagName:', tagName);
	console.info('pushImages:', pushImages);
	console.info('imageVersion:', imageVersion);
	console.info('isPreRelease:', isPreRelease);
	console.info('Docker tags:', dockerTags.join(', '));

	const platforms = [
		'linux/amd64',
		'linux/arm64',
		'linux/arm/v7',
	];

	// this will build a bunch of local image tags named: ${imageVersion}-${platform} with the slashes replaced with dashes
	for (const platform of platforms) {
		const normalizedPlatform = normalizePlatform(platform);
		await execCommand2([
			'docker', 'build',
			'--platform', platform,
			'-t', `${DockerImageName}:${imageVersion}-${normalizedPlatform}`,
			...buildArgs,
			'-f', 'Dockerfile.server',
			'.',
		]);
		if (pushImages) {
			await execCommand2([
				'docker', 'push', `${DockerImageName}:${imageVersion}-${normalizedPlatform}`,
			]);
		}
	}

	// now we have to create the right manifests and push them
	if (pushImages) {
		for (const tag of dockerTags) {
			// manifest create requires the tags being amended in to exist on the remote, so this all can only happen if pushImages is true
			const platformArgs: string[] = [];
			for (const platform in platforms) {
				platformArgs.concat('--amend', `${DockerImageName}:${imageVersion}-${normalizePlatform(platform)}`);
			}
			await execCommand2([
				'docker', 'manifest', 'create',
				`${DockerImageName}:${tag}`,
				...platformArgs,
			]);
			await execCommand2([
				'docker', 'manifest', 'push',
				`${DockerImageName}:${tag}`,
			]);
		}
	}
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
