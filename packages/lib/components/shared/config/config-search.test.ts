import { normalizeQuery, hasNormalizedQuery, toSearchText, shouldShowBySearch, equalsNormalizedQuery, includesNormalizedQuery } from './config-search-text';

describe('config-search', () => {
	it('should normalize query for case-insensitive matching', () => {
		expect(normalizeQuery('  SyNc  ')).toBe('sync');
		expect(normalizeQuery('\t\n')).toBe('');
	});

	it('should provide normalized query matching helpers', () => {
		expect(hasNormalizedQuery('   ')).toBe(false);
		expect(hasNormalizedQuery(' sync ')).toBe(true);

		expect(equalsNormalizedQuery(' General ', 'general')).toBe(true);
		expect(equalsNormalizedQuery(' General ', 'generally')).toBe(false);

		expect(includesNormalizedQuery('sync', 'Synchronization interval')).toBe(true);
		expect(includesNormalizedQuery('sync', 'General settings')).toBe(false);
	});

	it('should normalize related text inputs', () => {
		expect(toSearchText('alpha')).toBe('alpha');
		expect(toSearchText(['alpha', 'beta'])).toBe('alpha\nbeta');
		expect(toSearchText(null)).toBe('');
		expect(toSearchText(undefined)).toBe('');
	});

	it('should apply shared visibility predicate', () => {
		expect(shouldShowBySearch('general', 'General', 'other value')).toBe(true);
		expect(shouldShowBySearch('sync', 'General', 'Synchronization interval')).toBe(true);
		expect(shouldShowBySearch('   ', 'General', 'Synchronization interval')).toBe(false);
		expect(shouldShowBySearch('sync', 'General', 'No match here')).toBe(false);
		expect(shouldShowBySearch('sync', 'General', ['Synchronization', 'other'])).toBe(true);
	});
});
