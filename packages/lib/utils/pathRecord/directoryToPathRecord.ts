import { join } from 'path';
import shim from '../../shim';

const directoryToPathRecord = async (basePath: string): Promise<Record<string, string>> => {
	const dirStats = await shim.fsDriver().readDirStats(basePath, { recursive: true });
	const result: Record<string, string> = {};

	for (const stat of dirStats) {
		if (!stat.isDirectory()) {
			const fileContent = await shim.fsDriver().readFile(join(basePath, stat.path), 'utf8');
			if (typeof fileContent !== 'string') {
				throw new Error(`Failed to read file at ${stat.path}`);
			}
			result[stat.path] = fileContent;
		}
	}

	return result;
};

export default directoryToPathRecord;
