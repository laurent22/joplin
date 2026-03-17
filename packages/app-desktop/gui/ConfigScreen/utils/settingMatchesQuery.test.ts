import { describe, expect, it } from '@jest/globals';
import { filterItemsByQuery, settingMatchesQuery } from './settingMatchesQuery';

describe('settingMatchesQuery', () => {
	it('filters settings by label text', () => {
		expect(settingMatchesQuery('theme', ['Theme', 'Select the application theme.'])).toBe(true);
		expect(settingMatchesQuery('theme', ['Editor font size', 'Change the editor font size.'])).toBe(false);
	});

	it('filters settings by description text', () => {
		expect(settingMatchesQuery('application theme', ['Theme', 'Select the application theme.'])).toBe(true);
	});

	it('matches search queries case-insensitively', () => {
		expect(settingMatchesQuery('ThEmE', ['theme', 'select the application theme.'])).toBe(true);
		expect(settingMatchesQuery('synchronisation', ['Theme', 'Select the application theme.'])).toBe(false);
	});

	it('returns all settings when the search is cleared', () => {
		const settings = [
			{ key: 'theme', text: ['Theme', 'Select the application theme.'] },
			{ key: 'fontSize', text: ['Editor font size', 'Adjust the editor font size.'] },
		];

		expect(filterItemsByQuery(settings, '', setting => setting.text)).toEqual(settings);
		expect(filterItemsByQuery(settings, 'theme', setting => setting.text)).toEqual([settings[0]]);
	});
});
