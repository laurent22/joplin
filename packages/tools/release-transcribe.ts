import { execCommand } from '@joplin/utils';
import { rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';

const transcribeDir = `${rootDir}/packages/transcribe`;

async function main() {
	await gitPullTry();

	process.chdir(transcribeDir);
	const version = (await execCommand('npm version patch')).trim();
	const versionSuffix = '';
	const tagName = `transcribe-${version}${versionSuffix}`;

	const changelogPath = `${rootDir}/readme/about/changelog/transcribe.md`;

	await completeReleaseWithChangelog(changelogPath, version, tagName, 'Transcribe', false);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
