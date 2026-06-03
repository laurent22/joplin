import { execSync } from 'child_process';
import { FatalError } from '../utils/errors';
import logger from '../utils/logger';

// Verifies if the user has pushed the local code which he is going to publish on github or not
export default async function verifyGitState(): Promise<string> {

	// Executes the git command silently and returns the output back to the calling statement
	const runGit = (command: string, errorMessage: string): string => {
		try {
			return execSync(command, { encoding: 'utf8', cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }).trim();
		} catch (error) {
			if (command.includes('git rev-parse --is-inside-work-tree')) {
				throw new FatalError('The current directory is not a git repository or git is not installed.');
			}
			if (command.includes('git remote get-url origin')) {
				throw new FatalError('No remote named \'origin\' found.\nMake sure your plugin repository is hosted on GitHub.');
			}
			throw new FatalError(`${errorMessage}\n${error instanceof Error ? error.message : String(error)}`);
		}
	};

	// Checks if the current folder is a git repository or not
	runGit('git rev-parse --is-inside-work-tree', 'Git check failed.');

	// Checks if there is any uncommitted changes
	const status = runGit('git status --porcelain', 'Failed to check git status.');
	if (status !== '') {
		throw new FatalError('You have uncommitted changes. Please commit or stash them before publishing.\nRun: git status to see what\'s changed.');
	}
	logger.success('Working tree is clean.');

	// Gets the current latest local commit hash
	const commitHash = runGit('git rev-parse HEAD', 'Failed to extract commit hash.');
	if (commitHash.length !== 40) {
		throw new FatalError('Failed to extract a valid commit hash.');
	}
	logger.success(`Commit hash extracted: ${commitHash}`);

	// check if the local project is linked to github
	runGit('git remote get-url origin', 'No remote named \'origin\' found.');

	// Extract the remote commit hash and checks if the user has pushed the changes that he is going to publish
	const currentBranch = runGit('git rev-parse --abbrev-ref HEAD', 'Failed to get current branch name.');
	const remoteHeadLine = runGit(`git ls-remote origin ${currentBranch}`, 'Could not retrieve remote HEAD. Make sure you have pushed your changes and have an internet connection.');
	if (!remoteHeadLine) {
		throw new FatalError('Remote HEAD is empty. Make sure you have pushed your changes.');
	}

	const remoteHash = remoteHeadLine.split(/\s+/)[0];
	if (remoteHash !== commitHash) {
		throw new FatalError('Your local commit has not been pushed to GitHub.\nRun: git push then try publishing again.');
	}
	logger.success('Local commit is synced with remote.');

	return commitHash;
}
