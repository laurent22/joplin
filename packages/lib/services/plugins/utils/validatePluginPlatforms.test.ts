import validatePluginPlatforms from './validatePluginPlatforms';

describe('validatePluginPlatforms', () => {
	test.each([
		[['mobile>=2.00', 'desktop>=3.0'], true],
		[['mobile', 'desktop'], true],
		[['mobile'], true],
		[['desktop'], true],
		[['mobile>=3.14.15'], true],

		[['mobile>=3.14.x'], false],
		[['mobile>=3.....14'], false],
		[['mobile', 'some-other-platform>=3.14.15'], true],
		[['desktop', 'desktop>=3.2mobile-test'], false],
	])('should throw when given an invalid list of supported plugin platforms (case %#)', (platforms, shouldSupport) => {
		const callback = () => validatePluginPlatforms(platforms);
		if (shouldSupport) {
			expect(callback).not.toThrow();
		} else {
			expect(callback).toThrow();
		}
	});
});
