import * as fs from 'fs-extra';
const Datauri = require('datauri/sync');
import { dirname } from 'path';
import packToString from './packToString';

const dataUriEncode = (filePath: string): string => {
	const result = Datauri(filePath);
	return result.content;
};

export default async function htmlpack(inputFile: string, outputFile: string): Promise<void> {
	const inputHtml = await fs.readFile(inputFile, 'utf8');
	const baseDir = dirname(inputFile);

	const output = await packToString(baseDir, inputHtml, {
		exists(path: string) {
			return fs.exists(path);
		},
		readFileText(path: string) {
			return fs.readFile(path, 'utf8');
		},
		async readFileDataUri(path: string) {
			return dataUriEncode(path);
		},
	});

	await fs.writeFile(outputFile, output, 'utf8');
}
