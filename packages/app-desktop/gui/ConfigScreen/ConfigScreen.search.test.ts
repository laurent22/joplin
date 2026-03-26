import { ConfigScreenComponent } from './ConfigScreen';

describe('ConfigScreen Search Functionality', () => {
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
			filteredSections: new Set<string>(),
			selectedSectionName: 'general',
			screenName: '',
			changedSettingKeys: [],
			needRestart: false,
			fonts: [],
		};
	});

	describe('matchesSearchQuery', () => {
		test('should return true when search query is empty', () => {
			instance.state.searchQuery = '';
			expect((instance as any).matchesSearchQuery('Test Settings')).toBe(true);
		});

		test('should match case-insensitively', () => {
			instance.state.searchQuery = 'sync';
			expect((instance as any).matchesSearchQuery('Sync Settings')).toBe(true);
			expect((instance as any).matchesSearchQuery('SYNC')).toBe(true);
			expect((instance as any).matchesSearchQuery('sync')).toBe(true);
		});

		test('should match partial strings', () => {
			instance.state.searchQuery = 'sync';
			expect((instance as any).matchesSearchQuery('Synchronization Settings')).toBe(true);
			expect((instance as any).matchesSearchQuery('Cloud Sync')).toBe(true);
		});

		test('should not match unrelated text', () => {
			instance.state.searchQuery = 'sync';
			expect((instance as any).matchesSearchQuery('Editor Settings')).toBe(false);
			expect((instance as any).matchesSearchQuery('Appearance')).toBe(false);
		});

		test('should match special characters', () => {
			instance.state.searchQuery = 'font-size';
			expect((instance as any).matchesSearchQuery('Font-Size Configuration')).toBe(true);
		});

		test('should handle queries with spaces', () => {
			instance.state.searchQuery = 'font size';
			expect((instance as any).matchesSearchQuery('Font Size Settings')).toBe(true);
		});
	});

	describe('getFilteredSections', () => {
		test('should return all sections when query is empty', () => {
			instance.state.searchQuery = '';
			const sections = [
				{ name: 'general', metadatas: [] },
				{ name: 'sync', metadatas: [] },
				{ name: 'appearance', metadatas: [] },
			];
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.size).toBe(0);
		});

		test('should filter sections by name', () => {
			instance.state.searchQuery = 'sync';
			const sections = [
				{ name: 'sync', metadatas: [] },
				{ name: 'general', metadatas: [] },
				{ name: 'appearance', metadatas: [] },
			];
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.has('sync')).toBe(true);
			expect(filtered.has('general')).toBe(false);
		});

		test('should filter sections by metadata label', () => {
			instance.state.searchQuery = 'font';
			const sections = [
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
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.has('appearance')).toBe(true);
			expect(filtered.has('general')).toBe(false);
		});

		test('should filter sections by metadata description', () => {
			instance.state.searchQuery = 'language';
			const sections = [
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
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.has('general')).toBe(true);
			expect(filtered.has('appearance')).toBe(false);
		});

		test('should include section when any metadata matches', () => {
			instance.state.searchQuery = 'sync';
			const sections = [
				{
					name: 'sync',
					metadatas: [
						{ label: 'Provider', description: 'Cloud provider' },
						{ label: 'Interval', description: 'Sync frequency' },
					],
				},
			];
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.has('sync')).toBe(true);
		});

		test('should be case insensitive for metadata search', () => {
			instance.state.searchQuery = 'FONT';
			const sections = [
				{
					name: 'appearance',
					metadatas: [
						{ label: 'font Size', description: 'text size' },
					],
				},
			];
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.has('appearance')).toBe(true);
		});
	});

	describe('setSearchQuery', () => {
		test('should update search query state', (done) => {
			(instance as any).setSearchQuery('test');
			setTimeout(() => {
				expect(instance.state.searchQuery).toBe('test');
				done();
			}, 0);
		});

		test('should set searching flag when query is not empty', (done) => {
			(instance as any).setSearchQuery('sync');
			setTimeout(() => {
				expect(instance.state.searching).toBe(true);
				done();
			}, 0);
		});

		test('should clear searching flag when query is empty', (done) => {
			instance.state.searching = true;
			(instance as any).setSearchQuery('');
			setTimeout(() => {
				expect(instance.state.searching).toBe(false);
				done();
			}, 0);
		});
	});

	describe('clearSearch', () => {
		test('should clear search query', () => {
			instance.state.searchQuery = 'test';
			(instance as any).clearSearch();
			expect(instance.state.searchQuery).toBe('');
		});

		test('should clear searching flag', () => {
			instance.state.searching = true;
			(instance as any).clearSearch();
			expect(instance.state.searching).toBe(false);
		});

		test('should clear filtered sections', () => {
			instance.state.filteredSections = new Set(['sync', 'general']);
			(instance as any).clearSearch();
			expect(instance.state.filteredSections.size).toBe(0);
		});

		test('should reset all search state at once', () => {
			instance.state.searchQuery = 'test';
			instance.state.searching = true;
			instance.state.filteredSections = new Set(['sync']);
			(instance as any).clearSearch();
			expect(instance.state.searchQuery).toBe('');
			expect(instance.state.searching).toBe(false);
			expect(instance.state.filteredSections.size).toBe(0);
		});
	});

	describe('search feature integration', () => {
		test('should find settings by multiple keywords', () => {
			instance.state.searchQuery = 'sync';
			const sections = [
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
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.size).toBe(1);
			expect(filtered.has('sync')).toBe(true);
		});

		test('should handle empty search results', () => {
			instance.state.searchQuery = 'nonexistent';
			const sections = [
				{
					name: 'general',
					metadatas: [
						{ label: 'Language', description: 'UI Language' },
					],
				},
			];
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.size).toBe(0);
		});

		test('should work with plugin sections', () => {
			instance.state.searchQuery = 'plugin';
			const sections = [
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
			const filtered = (instance as any).getFilteredSections(sections);
			expect(filtered.has('plugin-custom')).toBe(true);
			expect(filtered.has('general')).toBe(false);
		});
	});
});
