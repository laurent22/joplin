import matchesSearchQuery from './configScreenUtils';

describe('ConfigScreen search', () => {
	test.each([
		['empty query never matches', '', 'General', 'Language', false],
		['matches setting label substring', 'lang', 'General', 'Language', true],
		['matches setting description substring', 'pick a font', 'Appearance', 'Pick a font size', true],
		['matches section title substring', 'appear', 'Appearance', 'Some unrelated text', true],
		['does not match unrelated text', 'xyz', 'General', 'Language', false],
		['matches one item in array of related text', 'dark', 'Appearance', ['Theme', 'Choose a dark or light theme'], true],
		['whitespace-only query does not match', '   ', 'General', 'Language', false],
	])('%s', (_label, query, sectionTitle, relatedText, expected) => {
		expect(matchesSearchQuery(query, sectionTitle, relatedText)).toBe(expected);
	});
});
