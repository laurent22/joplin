import convertLinksToLocale from './convertLinksToLocale';

describe('convertLinksToLocale', () => {

	it('should convert links', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const tests: [string, any, string][] = [
			[
				'test [link](/help/link)',
				{ pathPrefix: 'fr' },
				'test [link](/fr/help/link)',
			],
			[
				'test [link](/help/link) [link2](/link2)',
				{ pathPrefix: 'fr' },
				'test [link](/fr/help/link) [link2](/fr/link2)',
			],
		];

		for (const [input, locale, expected] of tests) {
			const actual = convertLinksToLocale(input, locale);
			expect(actual).toBe(expected);
		}
	});

});
