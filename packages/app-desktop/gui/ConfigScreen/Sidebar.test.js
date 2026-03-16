"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("@testing-library/react");
const styled_components_1 = require("styled-components");
const theme_1 = require("@joplin/lib/theme");
const Setting_1 = require("@joplin/lib/models/Setting");
const Sidebar_1 = require("./Sidebar");
const createSections = () => {
    return [
        {
            name: 'general',
            source: Setting_1.SettingSectionSource.Default,
            metadatas: [
                {
                    key: 'style.editor.fontFamily',
                    value: '',
                    type: Setting_1.default.TYPE_STRING,
                    public: true,
                    label: () => 'Editor font family',
                    description: () => 'Customize the editor font.',
                },
            ],
        },
        {
            name: 'sync',
            source: Setting_1.SettingSectionSource.Default,
            metadatas: [
                {
                    key: 'sync.advanced',
                    value: false,
                    type: Setting_1.default.TYPE_BOOL,
                    public: true,
                    label: () => 'Advanced sync options',
                    description: () => 'Configure advanced synchronization behavior.',
                },
            ],
        },
    ];
};
const renderSidebar = (searchQuery, onSelectionChange = jest.fn()) => {
    (0, react_1.render)(React.createElement(styled_components_1.ThemeProvider, { theme: (0, theme_1.themeStyle)(Setting_1.default.THEME_LIGHT) },
        React.createElement(Sidebar_1.default, { selection: 'general', onSelectionChange: onSelectionChange, sections: createSections(), searchQuery: searchQuery })));
    return onSelectionChange;
};
describe('ConfigScreen Sidebar search', () => {
    test('shows matching setting rows under their section', () => {
        renderSidebar('advanced');
        expect(react_1.screen.getByText('Advanced sync options')).toBeTruthy();
        expect(react_1.screen.queryByText('Editor font family')).toBeNull();
    });
    test('shows a no-results state for an unmatched query', () => {
        renderSidebar('query-without-match');
        expect(react_1.screen.getByText('No results')).toBeTruthy();
    });
    test('passes section and setting key when clicking a matching item', () => {
        const onSelectionChange = renderSidebar('advanced');
        react_1.fireEvent.click(react_1.screen.getByRole('button', { name: 'Advanced sync options' }));
        expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({
            section: expect.objectContaining({ name: 'sync' }),
            settingKey: 'sync.advanced',
        }));
    });
});
//# sourceMappingURL=Sidebar.test.js.map