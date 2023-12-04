import buildDefaultPlugins from '../buildDefaultPlugins';

const buildAll = (outputDirectory: string) => {
	return buildDefaultPlugins(outputDirectory, async () => { });
};

export default buildAll;
