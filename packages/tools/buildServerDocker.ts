import { execCommand2, rootDir } from './tool-utils';
import * as moment from 'moment';
import { flatten, normalizePlatform } from './helpers';

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

async function getRevision() {
	try {
		return await execCommand2('git rev-parse --short HEAD', { showStdout: false });
	} catch (error) {
		console.info('Could not get git commit: metadata revision field will be empty');
		return '';
	}
}

interface BuildMeta {
	tagName: string;
	isPreRelease: boolean;
	buildDate: string;
	imageVersion: string;
	revision: string;
}

async function determineMeta(tagName: string): Promise<BuildMeta> {
	const isPreRelease = getIsPreRelease(tagName);
	const buildDate = moment(new Date().getTime()).format('YYYY-MM-DDTHH:mm:ssZ');
	const imageVersion = getVersionFromTag(tagName, isPreRelease);
	const revision = await getRevision();

	return {
		tagName,
		isPreRelease,
		buildDate,
		imageVersion,
		revision,
	};
}

async function determineTags(meta: BuildMeta) {
	const versionPart = meta.imageVersion.split('.');

	const dockerTags: string[] = [];
	dockerTags.push(meta.isPreRelease ? 'beta' : 'latest');
	dockerTags.push(versionPart[0] + (meta.isPreRelease ? '-beta' : ''));
	dockerTags.push(`${versionPart[0]}.${versionPart[1]}${meta.isPreRelease ? '-beta' : ''}`);
	dockerTags.push(meta.imageVersion);

	return dockerTags;
}

async function main() {
	const argv = require('yargs').argv;
	if (!argv.tagName) throw new Error('--tag-name not provided');

	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	const pushImages = !!argv.pushImages;

	const meta = await determineMeta(argv.tagName);
	const dockerTags = await determineTags(meta);

	console.info('tagName:', meta.tagName);
	console.info('pushImages:', pushImages);
	console.info('imageVersion:', meta.imageVersion);
	console.info('isPreRelease:', meta.isPreRelease);
	console.info('Docker tags:', dockerTags.join(', '));

	const info = await buildSinglePlatform('linux/amd64', {
		buildArgs: {
			BUILD_DATE: meta.buildDate,
			REVISION: meta.revision,
			VERSION: meta.imageVersion,
		},
		imageVersion: meta.imageVersion,
	});

	for (const tag of dockerTags) {
		await execCommand2(['docker', 'tag', `joplin/server:${info.tag}`, `joplin/server:${tag}`]);
		if (pushImages) await execCommand2(`docker push joplin/server:${tag}`);
	}
}

interface BuildSinglePlatformOptions {
	buildArgs: Record<string, string>;
	imageVersion: string;
}

async function buildSinglePlatform(platform: string, options: BuildSinglePlatformOptions) {
	const buildArgs = flatten(Object.keys(options.buildArgs).map((k) => ['--build-arg', `${k}=${options.buildArgs[k]}`]));
	const normalizedPlatform = normalizePlatform(platform);
	const tag = `${options.imageVersion}-${normalizedPlatform}`;

	const command = [
		'docker', 'build',
		'--progress=plain',
		'--platform', platform,
		'-t', `joplin/server:${tag}`,
		...buildArgs,
		'-f', 'Dockerfile.server',
		'.',
	];

	await execCommand2(command);

	return {
		tag,
	};
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
