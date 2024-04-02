
const validatePluginPlatforms = (platforms: string[]) => {
	if (!platforms) {
		return;
	}

	if (!Array.isArray(platforms) || platforms.some(p => typeof p !== 'string')) {
		throw new Error('If specified, platforms must be a string array');
	}
};

export default validatePluginPlatforms;
