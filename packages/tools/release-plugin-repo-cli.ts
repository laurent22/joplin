import { execCommand } from '@joplin/utils';
import { chdir } from 'process';
import { rootDir, gitPullTry, releaseFinalGitCommands } from './tool-utils';
import { versionPatch } from '@joplin/utils/version';

const workDir = `${rootDir}/packages/plugin-repo-cli`;

async function main() {
	await gitPullTry();

	chdir(rootDir);
	await execCommand('yarn tsc');

	chdir(workDir);
	await execCommand('yarn dist');

	const newVersion = await versionPatch();

	console.info(`New version: ${newVersion}`);
	const tagName = `plugin-repo-cli-${newVersion}`;
	console.info(`Tag name: ${tagName}`);

	await execCommand('npm publish');

	console.info(releaseFinalGitCommands('Plugin Repo CLI', newVersion, tagName));
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
