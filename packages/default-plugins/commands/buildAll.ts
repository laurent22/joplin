import buildDefaultPlugins from '../buildDefaultPlugins';

const buildAll = (outputDirectory: string) => {
	return buildDefaultPlugins({
		outputParentDir: outputDirectory,
		beforeInstall: async () => { },
		beforePatch: async () => { },
	});
};

export default buildAll;
