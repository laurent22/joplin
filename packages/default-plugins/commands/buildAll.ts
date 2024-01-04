import buildDefaultPlugins from '../buildDefaultPlugins';
import { AppType } from '../types';

const buildAll = (appType: AppType, outputDirectory: string) => {
	return buildDefaultPlugins(appType, outputDirectory, async () => { });
};

export default buildAll;
