import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger';

const execAsync = promisify(exec);

// Verifies if the user has pushed the local code which he is going to publish on github or not
const verifyGitState = async () => {

	const runGit = async (command: string, errorMessage: string) => {
		try {
			const { stdout } = await execAsync(command, { encoding: 'utf8', cwd: process.cwd() });
			return stdout.trim();
		} catch (error: unknown) {
			if (error instanceof Error) {
				error.message = `${errorMessage}: ${error.message}`;
			}
			throw error;
		}
	};

	// Checks if the current folder is a git repository or not
	await runGit('git rev-parse --is-inside-work-tree', 'The current directory is not a git repository or git is not installed.');

	// Checks if there is any uncommitted changes
	const status = await runGit('git status --porcelain', 'Failed to check git status. Ensure git is installed and configured.');
	if (status !== '') {
		throw new Error('You have uncommitted changes. Please commit or stash them before publishing.');
	}
	logger.success('Working tree is clean.');

	// Gets the current latest local commit hash
	const commitHash = await runGit('git rev-parse HEAD', 'Could not get commit hash. Ensure you are in a valid Git repository with at least one commit.');
	if (commitHash.length !== 40) {
		throw new Error('Failed to extract a valid commit hash. Ensure that git is properly initialized and you have made at least one local commit (git commit) before publishing.');
	}
	logger.success(`Commit hash extracted: ${commitHash}`);

	// check if the local project is linked to github
	await runGit('git remote get-url origin', 'No remote named \'origin\' found. Make sure your plugin repository is hosted on GitHub.');

	const currentBranch = await runGit('git rev-parse --abbrev-ref HEAD', 'Failed to retrieve current branch name. Ensure git is configured correctly.');
	if (currentBranch === 'HEAD') {
		throw new Error('You are in a detached HEAD state. Checkout a branch (e.g. git checkout main) and push before publishing.');
	}

	const remoteHeadLine = await runGit(`git ls-remote origin ${currentBranch}`, 'Could not retrieve remote HEAD. Make sure you have pushed your changes and have an internet connection.');
	if (!remoteHeadLine) {
		throw new Error('Remote HEAD is empty. Make sure you have pushed your changes.');
	}

	const parts = remoteHeadLine.split('\n')[0].split(/\s+/);
	if (parts.length < 2) {
		throw new Error(`Unexpected git ls-remote output: "${remoteHeadLine}". Make sure your git remote and branch are configured correctly.`);
	}

	const remoteHash = parts[0];
	if (remoteHash.length !== 40) {
		throw new Error('Failed to extract a valid remote commit hash.');
	}

	if (remoteHash !== commitHash) {
		throw new Error('Your local commit has not been pushed to GitHub. Run git push then try publishing again.');
	}
	logger.success('Local commit is synced with remote.');

	return commitHash;
};

export default verifyGitState;
