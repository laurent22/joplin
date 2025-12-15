import { execCommand } from '@joplin/utils';
import { versionPatch } from '@joplin/utils/version';
import { gitCurrentBranch, githubRelease, gitPullTry, rootDir } from './tool-utils';

const appDir = `${rootDir}/packages/app-desktop`;

async function main() {
	await gitPullTry(false);

	process.chdir(appDir);

	console.info(`Running from: ${process.cwd()}`);

	const version = await versionPatch();
	const tagName = version;

	console.info(`New version number: ${version}`);

	await execCommand('git add -A');
	await execCommand(`git commit -m "Desktop release ${version}"`);
	await execCommand(`git tag ${tagName}`);
	await execCommand('git push');
	await execCommand('git push --tags');

	const releaseOptions = { isDraft: true, isPreRelease: true };

	console.info('Release options: ', releaseOptions);

	const release = await githubRelease('joplin', tagName, releaseOptions);
	const currentBranch = await gitCurrentBranch();

	console.info(`Created GitHub release: ${release.html_url}`);
	console.info('GitHub release page: https://github.com/laurent22/joplin/releases');
	console.info(`To create changelog: node packages/tools/git-changelog.js ${version}`);
	console.info(`To merge the version update: git checkout dev && git mergeff ${currentBranch} && git push && git checkout ${currentBranch}`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
