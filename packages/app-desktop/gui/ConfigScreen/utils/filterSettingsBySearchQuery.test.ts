import { AppType, SettingItem, SettingItemType, SettingMetadataSection } from '@joplin/lib/models/Setting';
import filterSettingsBySearchQuery from './filterSettingsBySearchQuery';

const makeMd = (key: string, label: string, description = ''): SettingItem => ({
	key,
	value: null,
	type: SettingItemType.String,
	public: true,
	label: () => label,
	...(description ? { description: () => description } : {}),
});

const makeSection = (name: string, items: SettingItem[], isScreen = false): SettingMetadataSection => ({
	name,
	metadatas: items,
	...(isScreen ? { isScreen: true } : {}),
});

describe('filterSettingsBySearchQuery', () => {
	const sections: SettingMetadataSection[] = [
		makeSection('general', [
			makeMd('locale', 'Language', 'App language setting'),
			makeMd('theme', 'Theme', 'Application theme'),
		]),
		makeSection('editor', [
			makeMd('editor.fontFamily', 'Font Family', 'Editor font'),
			makeMd('editor.fontSize', 'Font Size', 'Editor font size'),
		]),
		makeSection('encryption', [], true),
	];

	it('should return original array when query is empty', () => {
		expect(filterSettingsBySearchQuery(sections, '', AppType.Desktop)).toBe(sections);
	});

	it('should return original array when query is whitespace only', () => {
		expect(filterSettingsBySearchQuery(sections, '   ', AppType.Desktop)).toBe(sections);
	});

	it('should filter settings by label', () => {
		const result = filterSettingsBySearchQuery(sections, 'theme', AppType.Desktop);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('general');
		expect(result[0].metadatas).toHaveLength(1);
		expect(result[0].metadatas[0].key).toBe('theme');
	});

	it('should filter settings by description', () => {
		const result = filterSettingsBySearchQuery(sections, 'editor font', AppType.Desktop);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('editor');
		expect(result[0].metadatas).toHaveLength(2);
	});

	it('should filter settings by key', () => {
		const result = filterSettingsBySearchQuery(sections, 'locale', AppType.Desktop);
		expect(result).toHaveLength(1);
		expect(result[0].metadatas[0].key).toBe('locale');
	});

	it('should return matching settings from multiple sections', () => {
		const multiSectionData: SettingMetadataSection[] = [
			makeSection('general', [
				makeMd('theme', 'Theme', 'Application theme'),
				makeMd('general.font', 'Font', 'General font setting'),
			]),
			makeSection('editor', [
				makeMd('editor.fontFamily', 'Font Family', 'Editor font'),
			]),
		];
		const result = filterSettingsBySearchQuery(multiSectionData, 'font', AppType.Desktop);
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('general');
		expect(result[1].name).toBe('editor');
	});

	it('should be case-insensitive', () => {
		const result = filterSettingsBySearchQuery(sections, 'THEME', AppType.Desktop);
		expect(result).toHaveLength(1);
		expect(result[0].metadatas[0].key).toBe('theme');
	});

	it('should return empty array when no settings match', () => {
		// cspell:disable-next-line
		expect(filterSettingsBySearchQuery(sections, 'xyznotfound', AppType.Desktop)).toHaveLength(0);
	});

	it('should exclude screen-based sections from results', () => {
		// Screen sections have isScreen: true and no searchable metadatas.
		// cspell:disable-next-line
		const sectionsWithScreenMatch = [
			makeSection('general', [makeMd('general.key', 'General setting', '')]),
			// cspell:disable-next-line
			makeSection('myscreen', [makeMd('myscreen.key', 'Screen setting', '')], true),
		];
		const result = filterSettingsBySearchQuery(sectionsWithScreenMatch, 'screen', AppType.Desktop);
		expect(result).toHaveLength(0);
	});

	it('should not return sections where all settings were filtered out', () => {
		const result = filterSettingsBySearchQuery(sections, 'language', AppType.Desktop);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('general');
		expect(result[0].metadatas).toHaveLength(1);
		expect(result[0].metadatas[0].key).toBe('locale');
	});
});
