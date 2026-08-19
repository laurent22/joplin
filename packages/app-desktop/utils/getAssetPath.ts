import { dirname, join } from 'path';

const getAssetPath = (path: string) => {
	// __dirname sometimes points to app-desktop/
	const baseDir = __dirname.match(/utils[/\\]?$/) ? dirname(__dirname) : __dirname;
	return join(baseDir, path);
};

export default getAssetPath;
