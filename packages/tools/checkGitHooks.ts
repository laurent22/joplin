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
			throw Error(`git core.hooksPath is not set to '.husky/_' folder, but: '${gitHooksPath}'.`);
		}

	} catch (error) {
		throw new Error(`Pre-commit hook probably does not exist. \n\nTo fix this ensure that husky package was installed correctly by running "yarn add --exact husky" on the root folder. \n Error: ${error.message}`);
	}
};

checkGitHooks().catch(error => {
	console.error(error);
	process.exit(1);
});
