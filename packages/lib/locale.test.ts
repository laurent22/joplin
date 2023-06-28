import { closestSupportedLocale } from './locale';

describe('locale', () => {

	it('should find the closest matching locale', () => {
		const testCases: [string, string[], string][] = [
			['fr', ['fr_FR', 'en_GB'], 'fr_FR'],
			['pt-br', ['fr_FR', 'en_GB', 'pt_BR'], 'pt_BR'],
			['ro', ['fr_FR', 'en_GB', 'pt_BR'], 'en_GB'],
		];

		for (const [input, locales, expected] of testCases) {
			const actual = closestSupportedLocale(input, true, locales);
			expect(actual).toBe(expected);
		}
	});

});
