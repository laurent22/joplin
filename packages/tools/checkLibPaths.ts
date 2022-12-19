/* eslint-disable import/prefer-default-export */

import { readFile } from 'fs-extra';
import { normalize } from 'path';
import yargs = require('yargs');
import { dirname } from './tool-utils';

export const findInvalidImportPaths = (baseDir: string, fileContent: string): string[] => {
	const output: string[] = [];

	// We expect the code to be in a specific format, as formatted by eslint. So
	// checkLibPath must only be called after the linter hook.

	const regexes = [
		/^import .* from '(.*\.\.\/lib\/.*)'/gm,
		/^import .* = require\('(.*\.\.\/lib\/.*)'\)/gm,
		/^const .* = require\('(.*\.\.\/lib\/.*)'\)/gm,

		/^import .* from '(.*\.\.\/renderer\/.*)'/gm,
		/^import .* = require\('(.*\.\.\/renderer\/.*)'\)/gm,
		/^const .* = require\('(.*\.\.\/renderer\/.*)'\)/gm,
	];

	for (const regex of regexes) {
		while (true) {
			const matches = regex.exec(fileContent);
			if (!matches) break;
			const [line, packagePath] = matches;
			const fullPath = normalize(`${baseDir}/${packagePath}`);
			if (fullPath.includes('packages/lib/') || fullPath.includes('packages/renderer/')) output.push(line);
		}

	}

	return output;
};

const main = async () => {
	const argv = await yargs.argv;
	const filePaths = argv._ as string[];
	if (!filePaths || !filePaths.length) return;

	for (const filePath of filePaths) {
		const content = await readFile(filePath, 'utf8');
		const invalidImportPaths = findInvalidImportPaths(dirname(filePath), content);
		if (invalidImportPaths.length) throw new Error(`Invalid lib import paths in ${filePath}: ${invalidImportPaths.join(' / ')}`);
	}
};

if (require.main === module) {
// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
