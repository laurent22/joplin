
const validatePluginPlatforms = (platforms: string[]) => {
	if (!platforms) {
		return;
	}

	// {1,10}: Limit the size of the version to a reasonable value.
	const platformPattern = '^([a-zA-Z-]+)(>=[0-9.]{1,10})?$';
	const platformRegex = new RegExp(platformPattern);
	for (const platform of platforms) {
		if (!platform.match(platformRegex)) {
			throw new Error(`Each platform should match the pattern, ${platformPattern}`);
		} else if (platform.match(/[.]{2,}/)) {
			throw new Error('Version numbers in platform specifications should not contain adjacent dots (should be valid versions).');
		}
	}
};

export default validatePluginPlatforms;
