import { SettingItem } from '@joplin/lib/models/Setting';
import settingMatchesSearch from './configScreenUtils';

type SearchableSetting = Pick<SettingItem, 'label' | 'description'>;

const makeSetting = (label: string, description: string): SettingItem => {
	const setting: SearchableSetting = {
		label: () => label,
		description: () => description,
	};

	return setting as SettingItem;
};

describe('ConfigScreen search', () => {
	test.each([
		{
			title: 'empty query returns true',
			setting: makeSetting('Theme', 'Choose dark or light mode'),
			options: { searchQuery: '' },
			expected: true,
		},
		{
			title: 'whitespace query returns true',
			setting: makeSetting('Theme', 'Choose dark or light mode'),
			options: { searchQuery: '   ' },
			expected: true,
		},
		{
			title: 'matches label text',
			setting: makeSetting('Language', 'Choose application language'),
			options: { searchQuery: 'lang' },
			expected: true,
		},
		{
			title: 'matches description text',
			setting: makeSetting('Theme', 'Choose dark or light mode'),
			options: { searchQuery: 'dark' },
			expected: true,
		},
		{
			title: 'matches section title text',
			setting: makeSetting('Theme', 'Choose dark or light mode'),
			options: { searchQuery: 'appearance', sectionTitle: 'Appearance' },
			expected: true,
		},
		{
			title: 'matches extra texts for plugin settings',
			setting: makeSetting('Plugins', 'Manage plugins'),
			options: {
				searchQuery: 'kanban',
				extraTexts: ['Outline plugin', 'Kanban board plugin'],
			},
			expected: true,
		},
		{
			title: 'matches multi-term query regardless of term order in one field',
			setting: makeSetting('Markdown editor', 'Configure editor behaviour'),
			options: { searchQuery: 'editor markdown' },
			expected: true,
		},
		{
			title: 'matches multi-term query when terms are spread across fields',
			setting: makeSetting('Editor', 'Markdown options and rendering'),
			options: { searchQuery: 'editor markdown' },
			expected: true,
		},
		{
			title: 'returns false when one multi-term token is missing',
			setting: makeSetting('Editor', 'Formatting options'),
			options: { searchQuery: 'editor markdown' },
			expected: false,
		},
		{
			title: 'returns false for unrelated query',
			setting: makeSetting('Theme', 'Choose dark or light mode'),
			options: { searchQuery: 'sync' },
			expected: false,
		},
	])('$title', ({ setting, options, expected }) => {
		expect(settingMatchesSearch(setting, options)).toBe(expected);
	});
});
