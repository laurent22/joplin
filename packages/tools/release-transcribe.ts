import { rootDir, gitPullTry, completeReleaseWithChangelog } from './tool-utils';
import { yarnVersionPatch } from '@joplin/utils/version';

const transcribeDir = `${rootDir}/packages/transcribe`;

async function main() {
	await gitPullTry();

	process.chdir(transcribeDir);
	const version = await yarnVersionPatch();
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
