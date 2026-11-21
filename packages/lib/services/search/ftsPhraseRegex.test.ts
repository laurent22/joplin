import ftsPhraseRegex from './ftsPhraseRegex';

describe('search/ftsPhraseRegex', () => {

	test.each([
		[['building', 'ai'], 'Building AI', 0],
		[['building', 'ai'], 'Building, "AI"', 0],
		[['building', 'ai'], 'Building/AI', 0],
		[['building', 'ai'], 'Building 東京 AI, then Building AI', 21],
		[['building', 'ai'], 'Building привет AI', -1],
		[['building', 'ai'], 'Building AIs', -1],
		[['building*', 'ai*'], 'Buildings AIs', 0],
		[['building*', 'ai*'], 'Rebuilding AI', -1],
	])('should match %j in %j', (terms, text, expectedIndex) => {
		const match = ftsPhraseRegex(terms).exec(text);
		expect(match ? match.index : -1).toBe(expectedIndex);
	});

	test('should not backtrack excessively on long runs of separators', () => {
		const text = `building${'/'.repeat(100_000)}x`;
		const startTime = Date.now();
		expect(ftsPhraseRegex(['building*', 'ai*', 'privacy*']).exec(text)).toBeNull();
		expect(Date.now() - startTime).toBeLessThan(500);
	});

	test('should return null for a single term', () => {
		expect(ftsPhraseRegex(['building'])).toBeNull();
	});

});
