import { execCommand2, rootDir } from './tool-utils';
import * as moment from 'moment';

export function getVersionFromTag(tagName: string, isPreRelease: boolean): string {
	if (tagName.indexOf('server-') !== 0) throw new Error(`Invalid tag: ${tagName}`);
	const s = tagName.split('-');
	const suffix = isPreRelease ? '-beta' : '';
	return s[1].substr(1) + suffix;
}

export function getIsPreRelease(_tagName: string): boolean {
	// For now we only create pre-releases from CI. It's after, once the release
	// has been proven stable, that it is tagged as "latest".
	return true;
	// return tagName.indexOf('-beta') > 0;
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
		revision = await execCommand2('git rev-parse --short HEAD', { showStdout: false });
	} catch (error) {
		console.info('Could not get git commit: metadata revision field will be empty');
	}
	const buildArgs = `--build-arg BUILD_DATE="${buildDate}" --build-arg REVISION="${revision}" --build-arg VERSION="${imageVersion}"`;
	const dockerTags: string[] = [];
	const versionPart = imageVersion.split('.');
	dockerTags.push(isPreRelease ? 'beta' : 'latest');
	dockerTags.push(versionPart[0] + (isPreRelease ? '-beta' : ''));
	dockerTags.push(`${versionPart[0]}.${versionPart[1]}${isPreRelease ? '-beta' : ''}`);
	dockerTags.push(imageVersion);

	const platforms = [
		'linux/amd64',
		// 'linux/arm64',
		'linux/arm/v7',
	];

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	console.info('tagName:', tagName);
	console.info('pushImages:', pushImages);
	console.info('imageVersion:', imageVersion);
	console.info('isPreRelease:', isPreRelease);
	console.info('Docker tags:', dockerTags.join(', '));

	for (const platform of platforms) {
		const normalizedPlatform = platform.replace(/\//g, '-');
		const platformArgs = `--platform ${platform}`;
		const tag = `${imageVersion}-${normalizedPlatform}`;
		await execCommand2(`docker build --progress plain -t "joplin/server:${tag}" ${platformArgs} ${buildArgs} -f Dockerfile.server .`);

		if (pushImages) {
			await execCommand2(['docker', 'push', `joplin/server:${tag}`]);
		}
	}

	// now we have to create the right manifests and push them
	// manifests are how multi-arch builds work, they combine pre-built images from multiple architectures
	// into a single "tag" that will pull the right image based on the supported architectures on the client
	if (pushImages) {
		for (const tag of dockerTags) {
			// manifest create requires the tags being amended in to exist on the remote, so this all can only happen if pushImages is true
			await execCommand2([
				'docker', 'manifest', 'create', `joplin/server:${tag}`,
				...([].concat(...platforms.map((platform) => ['--amend', `joplin/server:${imageVersion}-${platform.replace(/\//g, '-')}`]))),
			]);
			await execCommand2(['docker', 'manifest', 'push', `joplin/server:${tag}`]);
		}
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
