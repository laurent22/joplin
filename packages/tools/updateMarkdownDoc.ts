import { chdir } from 'process';
import { execCommand2, rootDir, gitRepoCleanTry } from './tool-utils';
import updateDownloadPage from './website/updateDownloadPage';

async function main() {
	const doGitOperations = false;

	if (doGitOperations) {
		await gitRepoCleanTry();
		await execCommand2(['git', 'pull', '--rebase']);
	}

	await execCommand2(['node', `${rootDir}/packages/tools/update-readme-download.js`]);
	await execCommand2(['node', `${rootDir}/packages/tools/build-release-stats.js`, '--types=changelog']);
	await execCommand2(['node', `${rootDir}/packages/tools/build-release-stats.js`, '--types=stats', '--update-interval=30']);
	await execCommand2(['node', `${rootDir}/packages/tools/update-readme-sponsors.js`]);
	await execCommand2(['node', `${rootDir}/packages/tools/build-welcome.js`]);
	chdir(rootDir);
	await execCommand2(['yarn', 'run', 'buildApiDoc']);
	await updateDownloadPage();

	if (doGitOperations) {
		await execCommand2(['git', 'add', '-A']);
		await execCommand2(['git', 'commit', '-m', 'Update Markdown doc']);
		await execCommand2(['git', 'pull', '--rebase']);
		await execCommand2(['git', 'push']);
	}
}

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
