import validatePluginPlatforms from './validatePluginPlatforms';

describe('validatePluginPlatforms', () => {
	test.each([
		[['mobile', 'desktop'], true],
		['not-an-array', false],
		[[3, 4, 5], false],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	])('should throw when given an invalid list of supported plugin platforms (case %#)', (platforms: any, shouldSupport) => {
		const callback = () => validatePluginPlatforms(platforms);
		if (shouldSupport) {
			expect(callback).not.toThrow();
		} else {
			expect(callback).toThrow();
		}
	});
});
