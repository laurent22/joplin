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
		[['notReal>=3.14.15'], false],
		[['mobile', 'noApp>=3.14.15'], false],
		[['mobile', 'mobile-test'], false],
		[['desktop', 'desktop>=3.2mobile-test'], false],
	])('should throw when given an invalid list of supported plugin platforms', (platforms, shouldSupport) => {
		const callback = () => validatePluginPlatforms(platforms);
		if (shouldSupport) {
			expect(callback).not.toThrow();
		} else {
			expect(callback).toThrow(/should match the pattern/);
		}
	});
});
