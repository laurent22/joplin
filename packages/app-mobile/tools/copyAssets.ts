import * as fs from 'fs-extra';
import { dirname, join } from 'path';

const copyAssets = async () => {
	const appDir = dirname(__dirname);
	const assetsDir = join(dirname(appDir), 'renderer', 'assets');
	const webDir = join(appDir, 'web', 'public');
	await fs.copy(assetsDir, join(webDir, 'pluginAssets'));
};

export default copyAssets;
