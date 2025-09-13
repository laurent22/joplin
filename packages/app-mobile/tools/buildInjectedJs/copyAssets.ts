

import { exists, readFile, writeFile } from 'fs-extra';
import { outputDir } from './constants';

type InputFilePaths = {
	js: string;
	css?: string;
};

// Stores the contents of the file at [filePath] as an importable string.
// [name] should be the name (excluding the .js extension) of the output file that will contain
// the JSON-ified file content.
const copyAssets = async (name: string, input: InputFilePaths) => {
	const outputPath = `${outputDir}/${name}.js`;
	console.info(`Creating: ${outputPath}`);

	const hasJs = await exists(input.js);
	const js = hasJs ? await readFile(input.js, 'utf-8') : null;
	const hasCss = !!input.css && await exists(input.css);
	const css = hasCss ? await readFile(input.css, 'utf-8') : null;

	const json = `module.exports = {
		js: ${JSON.stringify(js)},
		css: ${JSON.stringify(css)}
	};`;
	await writeFile(outputPath, json);
};
export default copyAssets;
