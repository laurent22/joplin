'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('@testing-library/react');
const Sidebar_1 = require('./Sidebar');
const Setting_1 = require('@joplin/lib/models/Setting');
jest.mock('@joplin/lib/locale', () => ({
	_: (key) => key,
}));
jest.mock('@joplin/lib/utils/focusHandler', () => ({
	focus: jest.fn(),
}));
jest.mock('../lib/SearchInput/SearchInput', () => {
	return function MockSearchInput({ value, onChange, placeholder }) {
		return (React.createElement('input', { 'data-testid': 'search-input', value: value, onChange: (e) => onChange({ value: e.target.value }), placeholder: placeholder }));
	};
});
jest.mock('./searchHighlight', () => ({
	__esModule: true,
	default: jest.fn((text) => text),
}));
describe('Sidebar - Config Search Integration', () => {
	const mockSections = [
		{
			name: 'general',
			label: () => 'General',
			source: Setting_1.SettingSectionSource.Default,
			isScreen: false,
			metadatas: [
				{ key: 'sync.interval', label: () => 'Sync Interval', description: () => 'Interval for syncing', value: 60, type: 1, public: true },
			],
		},
		{
			name: 'security',
			label: () => 'Security',
			source: Setting_1.SettingSectionSource.Default,
			isScreen: false,
			metadatas: [
				{ key: 'sync.password', label: () => 'Password', description: () => 'Encryption password', value: '', type: 1, public: true },
			],
		},
		{
			name: 'appearance',
			label: () => 'Appearance',
			source: Setting_1.SettingSectionSource.Default,
			isScreen: false,
			metadatas: [
				{ key: 'theme', label: () => 'Theme', description: () => 'Color theme', value: 'light', type: 1, public: true },
			],
		},
	];
	const defaultProps = {
		selection: 'general',
		sections: mockSections,
		searchQuery: '',
		searchResultGroups: [],
		onSelectionChange: jest.fn(),
		onSearchQueryChange: jest.fn(),
		onSearchButtonClick: jest.fn(),
	};
	beforeEach(() => {
		jest.clearAllMocks();
	});
	test('should render all sections when no search query', () => {
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps }));
		expect(react_1.screen.getByText('General')).toBeDefined();
		expect(react_1.screen.getByText('Security')).toBeDefined();
		expect(react_1.screen.getByText('Appearance')).toBeDefined();
	});
	test('should disable sections without search matches', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
		];
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults }));
		const generalTab = react_1.screen.getByRole('tab', { name: /General/ });
		const securityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		// General matches and should be enabled
		expect(generalTab.getAttribute('aria-disabled')).not.toBe('true');
		// Security doesn't match and should be disabled
		expect(securityTab.getAttribute('aria-disabled')).toBe('true');
	});
	test('should prevent clicking disabled sections', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
		];
		const onSelectionChange = jest.fn();
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults, onSelectionChange: onSelectionChange }));
		const securityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		react_1.fireEvent.click(securityTab);
		expect(onSelectionChange).not.toHaveBeenCalled();
	});
	test('should allow clicking enabled sections during search', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
			{ sectionName: 'security', matchingKeys: ['sync.password'] },
		];
		const onSelectionChange = jest.fn();
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults, onSelectionChange: onSelectionChange }));
		const securityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		react_1.fireEvent.click(securityTab);
		expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ section: expect.objectContaining({ name: 'security' }) }));
	});
	test('should restore enabled state when search is cleared', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
		];
		const { rerender } = (0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults }));
		const securityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		expect(securityTab.getAttribute('aria-disabled')).toBe('true');
		// Clear search
		rerender(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: '', searchResultGroups: [] }));
		const updatedSecurityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		expect(updatedSecurityTab.getAttribute('aria-disabled')).not.toBe('true');
	});
	test('should skip disabled sections during keyboard navigation', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
			{ sectionName: 'appearance', matchingKeys: ['theme'] },
		];
		const onSelectionChange = jest.fn();
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, selection: 'general', searchQuery: 'sync', searchResultGroups: searchResults, onSelectionChange: onSelectionChange }));
		const generalTab = react_1.screen.getByRole('tab', { name: /General/ });
		react_1.fireEvent.keyDown(generalTab, { code: 'ArrowDown' });
		// Should skip Security and go to Appearance (which also has a match)
		expect(onSelectionChange).toHaveBeenCalled();
	});
	test('should update search query on input change', () => {
		const onSearchQueryChange = jest.fn();
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, onSearchQueryChange: onSearchQueryChange }));
		const searchInput = react_1.screen.getByTestId('search-input');
		react_1.fireEvent.change(searchInput, { target: { value: 'test' } });
		expect(onSearchQueryChange).toHaveBeenCalled();
	});
	test('should set proper tablist and tab roles for accessibility', () => {
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps }));
		const tablist = react_1.screen.getByRole('tablist');
		expect(tablist).toBeDefined();
		const tabs = react_1.screen.getAllByRole('tab');
		expect(tabs.length).toBe(mockSections.length);
	});
	test('should set aria-selected correctly for selected section', () => {
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, selection: 'general' }));
		const generalTab = react_1.screen.getByRole('tab', { name: /General/ });
		const securityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		expect(generalTab.getAttribute('aria-selected')).toBe('true');
		expect(securityTab.getAttribute('aria-selected')).toBe('false');
	});
	test('should set aria-controls for proper tab panel association', () => {
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps }));
		const generalTab = react_1.screen.getByRole('tab', { name: /General/ });
		expect(generalTab.getAttribute('aria-controls')).toBe('setting-section-general');
	});
	test('should set aria-disabled for disabled sections', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
		];
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults }));
		const disabledSection = react_1.screen.getByRole('tab', { name: /Security/ });
		expect(disabledSection.getAttribute('aria-disabled')).toBe('true');
	});
	test('should display search input with correct placeholder', () => {
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps }));
		const searchInput = react_1.screen.getByTestId('search-input');
		expect(searchInput.placeholder).toBe('Search settings...');
	});
	test('should display all matching sections in search results', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
			{ sectionName: 'security', matchingKeys: ['sync.password'] },
		];
		(0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults }));
		const generalTab = react_1.screen.getByRole('tab', { name: /General/ });
		const securityTab = react_1.screen.getByRole('tab', { name: /Security/ });
		expect(generalTab.getAttribute('aria-disabled')).not.toBe('true');
		expect(securityTab.getAttribute('aria-disabled')).not.toBe('true');
	});
	test('should apply disabled styles to non-matching sections', () => {
		const searchResults = [
			{ sectionName: 'general', matchingKeys: ['sync.interval'] },
		];
		const { container } = (0, react_1.render)(React.createElement(Sidebar_1.default, { ...defaultProps, searchQuery: 'sync', searchResultGroups: searchResults }));
		// Find the disabled tab element and verify its attributes
		const disabledTabs = container.querySelectorAll('[aria-disabled="true"]');
		expect(disabledTabs.length).toBeGreaterThan(0);
	});
});
// # sourceMappingURL=Sidebar.test.js.map
