import { readFile } from 'fs-extra';
import { execCommand } from './tool-utils';

const checkGitHooks = async () => {
	try {
		const husky = await readFile(`${process.cwd()}/../../node_modules/husky/package.json`);

		if (!husky) {
			throw new Error('Husky is not installed');
		}

		const gitHooksPath = await execCommand('git config --get core.hooksPath');

		if (gitHooksPath.trim() !== '.husky/_') {
			throw Error(`core.hooksPath is not set to .husky/_ folder: ${gitHooksPath}`);
		}

		const preCommit = await readFile(`${process.cwd()}/../../.husky/pre-commit`);

		if (!preCommit) {
			throw new Error('Empty pre-commit file');
		}

	} catch (error) {
		throw new Error(`Pre-commit hook probably does not exist. \n ${error.message}`);
	}
};

checkGitHooks().catch(error => {
	console.error(error);
	process.exit(1);
});
