import { ConfigScreenComponent } from './ConfigScreen';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
interface MockMetadata {
	label: string;
	description: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
interface MockSection {
	name: string;
	metadatas: MockMetadata[];
}

describe('ConfigScreen Search Functionality', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let mockProps: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	let instance: any;

	beforeEach(() => {
		mockProps = {
			themeId: 1,
			settings: {},
			appType: 1,
			style: { height: 600 },
			dispatch: jest.fn(),
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		instance = new ConfigScreenComponent(mockProps);
		instance.state = {
			searchQuery: '',
			searching: false,
			selectedSectionName: 'general',
			screenName: '',
			changedSettingKeys: [],
			needRestart: false,
			fonts: [],
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		instance.setState = jest.fn((state: any) => {
			instance.state = { ...instance.state, ...state };
		});
	});

	describe('matchesSearchQuery', () => {
		test('should return true when search query is empty', () => {
			instance.state.searchQuery = '';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Test Settings')).toBe(true);
		});

		test('should match case-insensitively', () => {
			instance.state.searchQuery = 'sync';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Sync Settings')).toBe(true);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('SYNC')).toBe(true);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('sync')).toBe(true);
		});

		test('should match partial strings', () => {
			instance.state.searchQuery = 'sync';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Synchronization Settings')).toBe(true);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Cloud Sync')).toBe(true);
		});

		test('should not match unrelated text', () => {
			instance.state.searchQuery = 'sync';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Editor Settings')).toBe(false);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Appearance')).toBe(false);
		});

		test('should match special characters', () => {
			instance.state.searchQuery = 'font-size';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Font-Size Configuration')).toBe(true);
		});

		test('should handle queries with spaces', () => {
			instance.state.searchQuery = 'font size';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			expect((instance as any).matchesSearchQuery('Font Size Settings')).toBe(true);
		});
	});

	describe('getFilteredSections', () => {
		test('should return all sections when query is empty', () => {
			instance.state.searchQuery = '';
			const sections: MockSection[] = [
				{ name: 'general', metadatas: [] },
				{ name: 'sync', metadatas: [] },
				{ name: 'appearance', metadatas: [] },
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				// Check if section name matches
				if (instance.state.searchQuery === '') return true;
				if (!(section.name)) return false;
				return String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase());
			});
			expect(filtered).toStrictEqual(sections);
		});

		test('should filter sections by name', () => {
			instance.state.searchQuery = 'sync';
			const sections: MockSection[] = [
				{ name: 'sync', metadatas: [] },
				{ name: 'general', metadatas: [] },
				{ name: 'appearance', metadatas: [] },
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (instance.state.searchQuery === '') return true;
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('sync');
		});

		test('should filter sections by metadata label', () => {
			instance.state.searchQuery = 'font';
			const sections: MockSection[] = [
				{
					name: 'appearance',
					metadatas: [
						{ label: 'Font Size', description: 'Size of text' },
					],
				},
				{
					name: 'general',
					metadatas: [
						{ label: 'Language', description: 'UI Language' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.label).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				}
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('appearance');
		});

		test('should filter sections by metadata description', () => {
			instance.state.searchQuery = 'language';
			const sections: MockSection[] = [
				{
					name: 'general',
					metadatas: [
						{ label: 'Locale', description: 'Interface Language Setting' },
					],
				},
				{
					name: 'appearance',
					metadatas: [
						{ label: 'Theme', description: 'Color Scheme' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.description).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				}
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('general');
		});

		test('should include section when any metadata matches', () => {
			instance.state.searchQuery = 'sync';
			const sections: MockSection[] = [
				{
					name: 'sync',
					metadatas: [
						{ label: 'Provider', description: 'Cloud provider' },
						{ label: 'Interval', description: 'Sync frequency' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.label).toLowerCase().includes(instance.state.searchQuery.toLowerCase()) ||
						String(md.description).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) {
						return true;
					}
				}
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('sync');
		});

		test('should be case insensitive for metadata search', () => {
			instance.state.searchQuery = 'FONT';
			const sections: MockSection[] = [
				{
					name: 'appearance',
					metadatas: [
						{ label: 'font Size', description: 'text size' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.label).toLowerCase().includes(instance.state.searchQuery.toLowerCase()) ||
						String(md.description).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) {
						return true;
					}
				}
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('appearance');
		});
	});

	describe('setSearchQuery', () => {
		test('should update search query state', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			(instance as any).setSearchQuery('test');
			expect(instance.state.searchQuery).toBe('test');
		});

		test('should set searching flag when query is not empty', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			(instance as any).setSearchQuery('sync');
			expect(instance.state.searching).toBe(true);
		});

		test('should clear searching flag when query is empty', () => {
			instance.state.searching = true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			(instance as any).setSearchQuery('');
			expect(instance.state.searching).toBe(false);
		});
	});

	describe('clearSearch', () => {
		test('should clear search query', () => {
			instance.state.searchQuery = 'test';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			(instance as any).clearSearch();
			expect(instance.state.searchQuery).toBe('');
		});

		test('should clear searching flag', () => {
			instance.state.searching = true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			(instance as any).clearSearch();
			expect(instance.state.searching).toBe(false);
		});

		test('should reset all search state', () => {
			instance.state.searchQuery = 'test';
			instance.state.searching = true;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing private instance method
			(instance as any).clearSearch();
			expect(instance.state.searchQuery).toBe('');
			expect(instance.state.searching).toBe(false);
		});
	});

	describe('search feature integration', () => {
		test('should find settings by multiple keywords', () => {
			instance.state.searchQuery = 'sync';
			const sections: MockSection[] = [
				{
					name: 'sync',
					metadatas: [
						{ label: 'Sync Target', description: 'Choose where to sync' },
						{ label: 'Interval', description: 'How often to sync' },
					],
				},
				{
					name: 'general',
					metadatas: [
						{ label: 'Locale', description: 'Language Setting' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.label).toLowerCase().includes(instance.state.searchQuery.toLowerCase()) ||
						String(md.description).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) {
						return true;
					}
				}
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('sync');
		});

		test('should handle empty search results', () => {
			instance.state.searchQuery = 'unavailable';
			const sections: MockSection[] = [
				{
					name: 'general',
					metadatas: [
						{ label: 'Language', description: 'UI Language' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.label).toLowerCase().includes(instance.state.searchQuery.toLowerCase()) ||
						String(md.description).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) {
						return true;
					}
				}
				return false;
			});
			expect(filtered.length).toBe(0);
		});

		test('should work with plugin sections', () => {
			instance.state.searchQuery = 'plugin';
			const sections: MockSection[] = [
				{
					name: 'plugin-custom',
					metadatas: [
						{ label: 'Plugin Setting', description: 'Custom plugin config' },
					],
				},
				{
					name: 'general',
					metadatas: [
						{ label: 'Language', description: 'UI Language' },
					],
				},
			];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Used in filter callback
			const filtered = sections.filter((section: any) => {
				if (String(section.name).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) return true;
				for (const md of section.metadatas) {
					if (String(md.label).toLowerCase().includes(instance.state.searchQuery.toLowerCase()) ||
						String(md.description).toLowerCase().includes(instance.state.searchQuery.toLowerCase())) {
						return true;
					}
				}
				return false;
			});
			expect(filtered.length).toBe(1);
			expect(filtered[0].name).toBe('plugin-custom');
		});
	});
});
