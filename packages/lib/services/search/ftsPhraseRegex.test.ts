import ftsPhraseRegex from './ftsPhraseRegex';

describe('search/ftsPhraseRegex', () => {

	test.each([
		['Building AI', 0],
		['Building, "AI"', 0],
		['Building 東京 AI, then Building AI', 21],
		['Building привет AI', -1],
	])('should find the phrase in %j', (text, expectedIndex) => {
		const match = ftsPhraseRegex(['building', 'ai']).exec(text);
		expect(match ? match.index : -1).toBe(expectedIndex);
	});

	test('should return null for a single term', () => {
		expect(ftsPhraseRegex(['building'])).toBeNull();
	});

});
