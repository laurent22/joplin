import { normalizeSearchString, settingMatchesSearch, sectionLabelMatchesSearch } from './searchUtils';

describe('configSearchUtils', () => {
	test.each([
		{ value: null, expected: '' },
		{ value: undefined, expected: '' },
		{ value: 'ABC', expected: 'abc' },
		{ value: 123, expected: '123' },
	])('normalizeSearchString should handle non-string input: %p', ({ value, expected }) => {
		expect(normalizeSearchString(value)).toBe(expected);
	});

	test.each([
		{
			query: 'plugin',
			label: 'Plugins',
			description: 'Manage plugins',
			expected: true,
		},
		{
			query: 'automatic backups',
			label: 'Backup plugins',
			description: 'Plugin to create manual and automatic backups.',
			expected: true,
		},
		{
			query: 'sync',
			label: 'Appearance',
			description: 'Theme options',
			expected: false,
		},
	])('settingMatchesSearch should match label/description: %p', ({ query, label, description, expected }) => {
		expect(settingMatchesSearch(query, label, description)).toBe(expected);
	});

	test.each([
		{ query: 'plug', sectionLabel: 'Plugins', expected: true },
		{ query: 'plugins', sectionLabel: 'Plugins', expected: true },
		{ query: 'sync', sectionLabel: 'Plugins', expected: false },
		{ query: '  ', sectionLabel: 'Plugins', expected: false },
	])('sectionLabelMatchesSearch should match section labels: %p', ({ query, sectionLabel, expected }) => {
		expect(sectionLabelMatchesSearch(query, sectionLabel)).toBe(expected);
	});
});
