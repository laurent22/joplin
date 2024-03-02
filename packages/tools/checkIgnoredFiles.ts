import { execCommand, getRootDir } from '@joplin/utils';
import { toSystemSlashes } from '@joplin/utils/path';
import { readFile, writeFile } from 'fs-extra';
import { chdir } from 'process';

const main = async () => {
	const rootDir = await getRootDir();
	chdir(rootDir);

	const previousContent = {
		'.gitignore': await readFile('.gitignore', 'utf8'),
		'.eslintignore': await readFile('.eslintignore', 'utf8'),
	};

	await execCommand('yarn updateIgnored', { quiet: true });

	const newContent = {
		'.gitignore': await readFile('.gitignore', 'utf8'),
		'.eslintignore': await readFile('.eslintignore', 'utf8'),
	};

	if (newContent['.gitignore'] !== previousContent['.gitignore'] || newContent['.eslintignore'] !== previousContent['.eslintignore']) {
		await writeFile('.gitignore', previousContent['.gitignore'], 'utf8');
		await writeFile('.eslintignore', previousContent['.eslintignore'], 'utf8');
		throw new Error(`.gitignore or .eslintignore would be modified - run \`cd "${toSystemSlashes(rootDir)}" && yarn updateIgnored\``);
	}
};

if (require.main === module) {
// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
