import { AppType, SettingItem } from '@joplin/lib/models/Setting';

type SearchableSetting = Pick<SettingItem, 'label' | 'description'>;

const settingMatchesSearch = (md: SearchableSetting, searchQuery: string): boolean => {
	if (!searchQuery) return true;

	const q = searchQuery.trim().toLowerCase();
	if (!q) return true;

	const labelText = md.label ? md.label() : '';
	const descriptionText = md.description ? md.description(AppType.Desktop) : '';
	const label = String(labelText || '').toLowerCase();
	const description = String(descriptionText || '').toLowerCase();

	return label.includes(q) || description.includes(q);
};

const makeSetting = (label: string, description: string): SettingItem => {
	const setting: SearchableSetting = {
		label: () => label,
		description: () => description,
	};

	return setting as SettingItem;
};

describe('ConfigScreen search', () => {
	test('empty query returns true', () => {
		const md = makeSetting('Theme', 'Choose dark or light mode');

		expect(settingMatchesSearch(md, '')).toBe(true);
	});

	test('whitespace query returns true', () => {
		const md = makeSetting('Theme', 'Choose dark or light mode');

		expect(settingMatchesSearch(md, '   ')).toBe(true);
	});

	test('matches label text', () => {
		const md = makeSetting('Language', 'Choose application language');

		expect(settingMatchesSearch(md, 'lang')).toBe(true);
	});

	test('matches description text', () => {
		const md = makeSetting('Theme', 'Choose dark or light mode');

		expect(settingMatchesSearch(md, 'dark')).toBe(true);
	});

	test('returns false for unrelated query', () => {
		const md = makeSetting('Theme', 'Choose dark or light mode');

		expect(settingMatchesSearch(md, 'sync')).toBe(false);
	});
});
