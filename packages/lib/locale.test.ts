import { closestSupportedLocale, setLocale, _n } from './locale';

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

	it('should translate plurals - en_GB', () => {
		setLocale('en_GB');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 1)).toBe('Copy Shareable Link');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 2)).toBe('Copy Shareable Links');
	});

	it('should translate plurals - fr_FR', () => {
		setLocale('en_GB');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 1)).toBe('Copier lien partageable');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 2)).toBe('Copier liens partageables');
	});

});
