import { normalizeQuery, hasNormalizedQuery, equalsNormalizedQuery, includesNormalizedQuery, isMetadataMatched, searchResultGroups } from './config-search';
import { AppType, SettingItem, SettingItemType, SettingMetadataSection, SettingSectionSource } from '../../../models/Setting';

describe('config-search', () => {
	const createMetadata = (labelText: string, descriptionText?: string): SettingItem => {
		return {
			key: 'test',
			value: '',
			type: SettingItemType.String,
			public: true,
			label: () => labelText,
			...(descriptionText === undefined ? {} : { description: () => descriptionText }),
		};
	};

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

	it('should match query in label, description, and section title', () => {
		const section: SettingMetadataSection = {
			name: 'general',
			isScreen: false,
			source: SettingSectionSource.Default,
			metadatas: [],
		};

		expect(
			isMetadataMatched('sync', section, createMetadata('Synchronization Interval'), AppType.Desktop),
		).toBe(true);

		expect(
			isMetadataMatched('operations', section, createMetadata('Interval', 'Time between sync operations'), AppType.Desktop),
		).toBe(true);

		expect(
			isMetadataMatched('general', section, createMetadata(''), AppType.Desktop),
		).toBe(true);
	});

	it('should return no groups for empty or whitespace-only query', () => {
		const sections: SettingMetadataSection[] = [];
		expect(searchResultGroups('', sections, AppType.Desktop)).toEqual([]);
		expect(searchResultGroups('   ', sections, AppType.Desktop)).toEqual([]);
	});

	it('should return grouped results with unique section names', () => {
		const sections: SettingMetadataSection[] = [{
			name: 'synchronisation',
			isScreen: false,
			source: SettingSectionSource.Default,
			metadatas: [{
				...createMetadata('Synchronization interval'),
				key: 'sync.interval',
			}],
		}];

		const result = searchResultGroups('sync', sections, AppType.Desktop);

		expect(result.length).toBeGreaterThan(0);
		expect(new Set(result.map(group => group.sectionName)).size).toBe(result.length);
	});

	it('should include plugin metadata in matching path', () => {
		const pluginSection: SettingMetadataSection = {
			name: 'test_plugin',
			isScreen: false,
			source: SettingSectionSource.Plugin,
			metadatas: [
				{
					...createMetadata('Enable Test Plugin'),
					key: 'plugin.test.enabled',
				},
			],
		};

		expect(isMetadataMatched('test', pluginSection, pluginSection.metadatas[0], AppType.Desktop)).toBe(true);
	});
});
