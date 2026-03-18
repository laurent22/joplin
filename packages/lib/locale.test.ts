import { closestSupportedLocale, setLocale, _n, toIso639Alpha3, languageName, iso639LineToObject } from './locale';

describe('locale', () => {

	it('should find the closest matching locale', () => {
		const testCases: [string, string[], string][] = [
			['fr', ['fr_FR', 'en_GB'], 'fr_FR'],
			['pt-br', ['fr_FR', 'en_GB', 'pt_BR'], 'pt_BR'],
			['ro', ['fr_FR', 'en_GB', 'pt_BR'], 'en_GB'],
			['zh-TW', ['en_GB', 'zh_CN', 'zh_TW'], 'zh_TW'],
			['zh-CN', ['en_GB', 'zh_CN', 'zh_TW'], 'zh_CN'],
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

	test.each([
		['aar', 'aa', 'Afar', 'Afar'],
		['ave', 'ae', 'Avestan', 'Avestan'],
		['cat', 'ca', 'Catalan; Valencian', 'Catalan'],
		['chu', 'cu', 'Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic', 'Church Slavic'],
		['dan', 'da', 'Danish', 'Danish'],
		['ell', 'el', 'Greek, Modern (1453-)', 'Greek'],
		['eng', 'en', 'English', 'English'],
		['spa', 'es', 'Spanish; Castilian', 'Spanish'],
		['nob', 'nb', 'Bokmål, Norwegian; Norwegian Bokmål', 'Bokmål'],
	])('should simplify English language name: %s (%s) %s -> %s', (alpha3, alpha2, rawName, expected) => {
		const result = iso639LineToObject([alpha3, alpha2, rawName]);
		expect(result.nameEnglish).toBe(expected);
	});

});
