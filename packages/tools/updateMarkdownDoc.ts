import { execCommand } from '@joplin/utils';
import { chdir } from 'process';
import { rootDir, gitRepoCleanTry } from './tool-utils';
import updateDownloadPage from './website/updateDownloadPage';

async function main() {
	const doGitOperations = false;

	if (doGitOperations) {
		await gitRepoCleanTry();
		await execCommand(['git', 'pull', '--rebase']);
	}

	await execCommand(['node', `${rootDir}/packages/tools/update-readme-download.js`]);
	await execCommand(['node', `${rootDir}/packages/tools/build-release-stats.js`, '--types=changelog']);
	await execCommand(['node', `${rootDir}/packages/tools/build-release-stats.js`, '--types=stats', '--update-interval=30']);
	await execCommand(['node', `${rootDir}/packages/tools/update-readme-sponsors.js`]);
	await execCommand(['node', `${rootDir}/packages/tools/build-welcome.js`]);
	chdir(rootDir);
	await execCommand(['yarn', 'run', 'buildApiDoc']);
	await updateDownloadPage();

	if (doGitOperations) {
		await execCommand(['git', 'add', '-A']);
		await execCommand(['git', 'commit', '-m', 'Update Markdown doc']);
		await execCommand(['git', 'pull', '--rebase']);
		await execCommand(['git', 'push']);
	}
}

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
