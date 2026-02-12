import ocrLanguageFromLocale from './ocrLanguageFromLocale';

describe('ocrLanguageFromLocale', () => {
	test.each([
		['nb_NO', 'nor'],
		['nn_NO', 'nor'],
		['no', 'nor'],
		['en_GB', 'eng'],
	])('maps %s to %s', (input, expected) => {
		expect(ocrLanguageFromLocale(input)).toBe(expected);
	});
});
