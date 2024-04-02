
import shim from '@joplin/lib/shim';
import { join, dirname } from 'path';

const createFilesFromPathRecord = async (baseDir: string, fileContents: Record<string, string>) => {
	for (const relativePath in fileContents) {
		const targetPath = join(baseDir, relativePath);
		await shim.fsDriver().mkdir(dirname(targetPath));
		await shim.fsDriver().writeFile(targetPath, fileContents[relativePath], 'utf-8');
	}
};

export default createFilesFromPathRecord;
