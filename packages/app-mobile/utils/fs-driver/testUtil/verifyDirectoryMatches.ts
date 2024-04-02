
import shim from '@joplin/lib/shim';
import { join } from 'path';

const verifyDirectoryMatches = async (baseDir: string, fileContents: Record<string, string>) => {
	for (const path in fileContents) {
		const fileContent = await shim.fsDriver().readFile(join(baseDir, path), 'utf8');
		const expectedContent = fileContents[path];
		if (fileContent !== fileContents[path]) {
			throw new Error(`File ${path} content mismatch. Was ${JSON.stringify(fileContent)}, expected ${JSON.stringify(expectedContent)}.`);
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
