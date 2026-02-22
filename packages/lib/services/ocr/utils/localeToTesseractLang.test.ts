import localeToTesseractLang from './localeToTesseractLang';

describe('localeToTesseractLang', () => {
	const testData: [string, string][] = [
		// Chinese – needs country code to distinguish Simplified vs Traditional
		['zh_CN', 'chi_sim'],
		['zh_SG', 'chi_sim'],
		['zh', 'chi_sim'], // generic Chinese falls back to Simplified
		['zh_TW', 'chi_tra'],
		['zh_HK', 'chi_tra'],

		// Norwegian – Tesseract only has 'nor', not 'nob' or 'nno'
		['nb_NO', 'nor'],
		['nn_NO', 'nor'],

		// Common languages – ISO 639-3 code should pass through unchanged
		['en_US', 'eng'],
		['fr_FR', 'fra'],
		['de_DE', 'deu'],
		['ja_JP', 'jpn'],
		['ko_KR', 'kor'],
	];

	it('should return correct Tesseract language codes', () => {
		for (const [locale, expected] of testData) {
			expect(localeToTesseractLang(locale)).toBe(expected);
		}
	});
});
