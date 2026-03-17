import { encryptionSearchKeywords, matchesSearchQueryValue } from './searchUtils';

describe('ConfigScreen search helpers', () => {
	test('matches query by case-insensitive substring', () => {
		const matches = matchesSearchQueryValue('enc', ['End-to-end encryption', 'Encryption: Enabled']);
		expect(matches).toBe(true);
	});

	test('matches exact section title', () => {
		const matches = matchesSearchQueryValue('sync', 'unrelated content', 'Sync');
		expect(matches).toBe(true);
	});

	test('does not match empty or whitespace-only query', () => {
		expect(matchesSearchQueryValue('', 'End-to-end encryption', 'Encryption')).toBe(false);
		expect(matchesSearchQueryValue('   ', 'End-to-end encryption', 'Encryption')).toBe(false);
	});

	test('returns encryption keywords for disabled state', () => {
		const keywords = encryptionSearchKeywords(false, (input: string) => input);
		expect(keywords).toEqual(['End-to-end encryption', 'Enable encryption']);
	});

	test('returns encryption keywords for enabled state', () => {
		const keywords = encryptionSearchKeywords(true, (input: string) => input);
		expect(keywords).toEqual(['End-to-end encryption', 'Disable encryption']);
	});
});
