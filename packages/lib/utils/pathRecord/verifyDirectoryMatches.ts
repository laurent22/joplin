
import shim from '../../shim';
import { join } from 'path';

interface FileContentRecord {
	[path: string]: string|RegExp;
}

const verifyDirectoryMatches = async (baseDir: string, fileContents: FileContentRecord) => {
	for (const path in fileContents) {
		if (!(await shim.fsDriver().exists(join(baseDir, path)))) {
			throw new Error(`Expected file ${path} to exist.`);
		}

		const fileContent = await shim.fsDriver().readFile(join(baseDir, path), 'utf8');
		const expectedContent = fileContents[path];
		const matches = typeof expectedContent === 'string' ? fileContent === expectedContent : expectedContent.exec(fileContent);
		if (!matches) {
			const expectedLabel = typeof expectedContent === 'string' ? JSON.stringify(expectedContent) : expectedContent.toString();
			throw new Error(`File ${path} content mismatch. Was ${JSON.stringify(fileContent)}, expected ${expectedLabel}.`);
		}
	}

	const dirStats = await shim.fsDriver().readDirStats(baseDir, { recursive: true });
	for (const stat of dirStats) {
		if (!stat.isDirectory() && !(stat.path in fileContents)) {
			throw new Error(`Unexpected file with path ${stat.path} found.`);
		}
	}
};

export default verifyDirectoryMatches;
