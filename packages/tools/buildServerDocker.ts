import { rootDir } from './tool-utils';
import * as moment from 'moment';
import { execCommand } from '@joplin/utils';

interface Argv {
	dryRun?: boolean;
	pushImages?: boolean;
	repository?: string;
	tagName?: string;
	platform?: string;
	source?: string;
	addLatestTag?: boolean;
	dockerFile?: string;
}

function parseArgv(): Argv {
	return require('yargs')
		.scriptName('yarn buildServerDocker')
		.usage('$0 --repository OWNER/IMAGE [args]')
		.option('dockerFile', {
			describe: 'Dockerfile - either Dockerfile.server or Dockerfile.transcribe',
			demandOption: true,
			type: 'string',
		})
		.option('repository', {
			describe: 'Target image repository. Usually in format `OWNER/NAME`',
			demandOption: true,
			type: 'string',
		})
		.option('tagName', {
			describe: 'Base image tag. Usually should be in format `server-v1.2.3` or `server-v1.2.3-beta`. The latest `server-v*` git tag will be used by default.',
			type: 'string',
		})
		.option('addLatestTag', {
			describe: 'Add `latest` tag even for pre-release images.',
			type: 'boolean',
			default: false,
		})
		.option('platform', {
			describe: 'Comma separated list of target image platforms. E.g. `linux/amd64` or `linux/amd64,linux/arm64`',
			type: 'string',
			default: 'linux/amd64',
		})
		.option('source', {
			describe: 'Source Git repository for the images.',
			type: 'string',
			default: 'https://github.com/laurent22/joplin.git',
		})
		.option('pushImages', {
			describe: 'Publish images to target repository.',
			type: 'boolean',
			default: false,
		})
		.option('dryRun', {
			describe: 'Do not call docker, just show command instead.',
			type: 'boolean',
			default: false,
		})
		.help()
		.argv as Argv;
}

export function getVersionFromTag(tagName: string, isPreRelease: boolean): string {
	const s = tagName.split('-');
	const mainVersion = s[1].replace(/^(v)/, '');
	const metaComponents = s.slice(2).filter(item => item !== 'beta');

	// Append `git describe` components for pre release images. Mostly for case without `tagName` arg
	const suffix = isPreRelease ? `-beta${metaComponents.length > 0 ? `.${metaComponents.join('.')}` : ''}` : '';
	return mainVersion + suffix;
}

export function getIsPreRelease(_tagName: string): boolean {
	// For now we only create pre-releases from CI. It's after, once the release
	// has been proven stable, that it is tagged as "latest".
	return false;
	// return tagName.indexOf('-beta') > 0;
}

async function main() {
	const argv = parseArgv();
	if (!argv.tagName) console.info('No `--tag-name` was specified. A latest git tag will be used instead.');

	console.info('Raw arguments:', argv);

	const dryRun = argv.dryRun;
	const addLatestTag = argv.addLatestTag;
	const dockerFile = argv.dockerFile;
	const pushImages = argv.pushImages;
	const repository = argv.repository;
	const tagName = argv.tagName || `server-${await execCommand('git describe --tags --match v*', { showStdout: false })}`;
	const platform = argv.platform;
	const source = argv.source;
	const architecture = argv.platform.split('/')[1];

	const isPreRelease = getIsPreRelease(tagName);
	const imageVersion = getVersionFromTag(tagName, isPreRelease);
	const buildDate = moment(new Date().getTime()).format('YYYY-MM-DDTHH:mm:ssZ');
	let revision = '';
	try {
		revision = await execCommand('git rev-parse --short HEAD', { showStdout: false });
	} catch (error) {
		console.info('Could not get git commit: metadata revision field will be empty');
	}

	const buildArgs = [];
	buildArgs.push(`BUILD_DATE="${buildDate}"`);
	buildArgs.push(`REVISION="${revision}"`);
	buildArgs.push(`VERSION="${imageVersion}"`);
	buildArgs.push(`SOURCE="${source}"`);

	const dockerTags: string[] = [];
	const versionParts = imageVersion.split('.');
	const patchVersionPart = versionParts[2].split('-')[0];
	dockerTags.push(isPreRelease ? 'latest-beta' : 'latest');
	dockerTags.push(versionParts[0] + (isPreRelease ? '-beta' : ''));
	dockerTags.push(`${versionParts[0]}.${versionParts[1]}${isPreRelease ? '-beta' : ''}`);
	dockerTags.push(`${versionParts[0]}.${versionParts[1]}.${patchVersionPart}${isPreRelease ? '-beta' : ''}`);
	if (dockerTags.indexOf(imageVersion) < 0) {
		dockerTags.push(imageVersion);
	}
	if (addLatestTag && dockerTags.indexOf('latest') < 0) {
		dockerTags.push('latest');
	}


	process.chdir(rootDir);
	console.info(`Running from: ${process.cwd()}`);

	console.info('dockerFile:', dockerFile);
	console.info('repository:', repository);
	console.info('tagName:', tagName);
	console.info('platform:', platform);
	console.info('pushImages:', pushImages);
	console.info('imageVersion:', imageVersion);
	console.info('isPreRelease:', isPreRelease);
	console.info('Docker tags:', dockerTags.join(', '));

	const cliArgs = ['--progress=plain'];
	cliArgs.push(`--platform ${platform}`);
	cliArgs.push(...dockerTags.map(tag => `--tag "${repository}:${architecture}-${tag}"`));
	cliArgs.push(...buildArgs.map(arg => `--build-arg ${arg}`));
	if (pushImages) {
		cliArgs.push('--push');
	}
	cliArgs.push(`--file ${dockerFile}`);
	cliArgs.push('.');

	const dockerCommand = `docker buildx build ${cliArgs.join(' ')}`;

	console.info('exec:', dockerCommand);
	if (dryRun) {
		return;
	}

	await execCommand(dockerCommand);
}

if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
