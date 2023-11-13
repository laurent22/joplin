

import { readFile, writeFile } from 'fs-extra';
import { outputDir } from './constants';

// Stores the contents of the file at [filePath] as an importable string.
// [name] should be the name (excluding the .js extension) of the output file that will contain
// the JSON-ified file content.
const copyJs = async (name: string, filePath: string) => {
	const outputPath = `${outputDir}/${name}.js`;
	console.info(`Creating: ${outputPath}`);
	const js = await readFile(filePath, 'utf-8');
	const json = `module.exports = ${JSON.stringify(js)};`;
	await writeFile(outputPath, json);
};
export default copyJs;
