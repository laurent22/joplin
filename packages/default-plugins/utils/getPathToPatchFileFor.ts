
import { join, dirname } from 'path';

const getPathToPatchFileFor = (pluginName: string) => {
	const rootDir = dirname(__dirname);
	return join(rootDir, 'plugin-patches', `${pluginName}.diff`);
};

export default getPathToPatchFileFor;
