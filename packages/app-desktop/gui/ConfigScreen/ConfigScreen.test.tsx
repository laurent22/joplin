import filterSettingsByQuery from './filterSettingsByQuery';
import { AppType } from '@joplin/lib/models/Setting';

const mockSections = [
	{
		name: 'general',
		metadatas: [
			{ key: 'theme', label: 'Theme', description: 'Application theme' },
			{ key: 'locale', label: 'Language', description: 'Application language' },
		],
	},
	{
		name: 'sync',
		metadatas: [
			{ key: 'sync.target', label: 'Synchronisation target', description: 'The target to sync to' },
		],
	},
];

describe('filterSettingsByQuery', () => {
	test('returns matching keys when query matches label', () => {
		const result = filterSettingsByQuery(mockSections, 'theme', AppType.Desktop);
		expect(result).toContain('theme');
		expect(result).not.toContain('locale');
	});

	test('returns matching keys when query matches description', () => {
		const result = filterSettingsByQuery(mockSections, 'sync to', AppType.Desktop);
		expect(result).toContain('sync.target');
	});

	test('returns empty array when no settings match', () => {
		const result = filterSettingsByQuery(mockSections, 'example', AppType.Desktop);
		expect(result).toHaveLength(0);
	});

	test('search is case insensitive', () => {
		const result = filterSettingsByQuery(mockSections, 'THEME', AppType.Desktop);
		expect(result).toContain('theme');
	});

	test('returns results across multiple sections', () => {
		const result = filterSettingsByQuery(mockSections, 'application', AppType.Desktop);
		expect(result).toContain('theme');
		expect(result).toContain('locale');
	});

	test('supports function-based labels', () => {
		const sectionsWithFnLabel = [
			{
				name: 'general',
				metadatas: [
					{ key: 'font', label: () => 'Font family', description: '' },
				],
			},
		];
		const result = filterSettingsByQuery(sectionsWithFnLabel, 'font', AppType.Desktop);
		expect(result).toContain('font');
	});
});
