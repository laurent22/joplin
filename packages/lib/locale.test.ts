import { closestSupportedLocale, setLocale, _n, toIso639Alpha3, languageName } from './locale';

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
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', -2)).toBe('Copy Shareable Links');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 0)).toBe('Copy Shareable Links');
	});

	it('should translate plurals - fr_FR', () => {
		setLocale('fr_FR');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 1)).toBe('Copier le lien partageable');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 2)).toBe('Copier les liens partageables');
	});

	it('should translate plurals - pl_PL', () => {
		setLocale('pl_PL');
		// Not the best test since 5 is the same as 2, but it's all I could find
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 1)).toBe('Kopiuj udostępnialny link');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 2)).toBe('Kopiuj udostępnialne linki');
		expect(_n('Copy Shareable Link', 'Copy Shareable Links', 5)).toBe('Kopiuj udostępnialne linki');
	});

	test.each([
		['en_GB', 'eng'],
		['en', 'eng'],
		['de', 'deu'],
		['fr_FR', 'fra'],
	])('should convert to ISO-639 alpha-3', (input, expected) => {
		const actual = toIso639Alpha3(input);
		expect(actual).toBe(expected);
	});

	test.each([
		['en', 'English'],
		['en_US', 'English'],
		['fr', 'Français'],
		['br', 'Breton'],
	])('should give the language name', (input, expected) => {
		const actual = languageName(input);
		expect(actual).toBe(expected);
	});

});
