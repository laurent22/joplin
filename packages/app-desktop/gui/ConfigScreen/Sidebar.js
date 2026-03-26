"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyledListItemIcon = exports.StyledListItemLabel = exports.StyledClearButton = exports.StyledSearchInput = exports.StyledSearchContainer = exports.StyledDivider = exports.StyledListItem = exports.StyledRoot = void 0;
exports.default = Sidebar;
const Setting_1 = require("@joplin/lib/models/Setting");
const React = require("react");
const Setting_2 = require("@joplin/lib/models/Setting");
const locale_1 = require("@joplin/lib/locale");
const react_1 = require("react");
const focusHandler_1 = require("@joplin/lib/utils/focusHandler");
const HighlightedText_1 = require("./controls/HighlightedText");
const styled = require('styled-components').default;
exports.StyledRoot = styled.div `
	display: flex;
	background-color: ${(props) => props.theme.backgroundColor2};
	flex-direction: column;
	overflow-x: hidden;
	overflow-y: auto;
`;
exports.StyledListItem = styled.a `
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	padding: ${(props) => props.theme.mainPadding}px;
	background: ${(props) => props.selected ? props.theme.selectedColor2 : 'none'};
	transition: 0.1s;
	text-decoration: none;
	cursor: default;
	opacity: ${(props) => props.selected ? 1 : 0.8};
	padding-left: ${(props) => props.isSubSection ? '35' : props.theme.mainPadding}px;

	&:hover {
		background-color: ${(props) => props.theme.backgroundColorHover2};
	}
`;
exports.StyledDivider = styled.div `
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	color: ${(props) => props.theme.color2};
	padding: ${(props) => props.theme.mainPadding}px;
	padding-top: ${(props) => props.theme.mainPadding * .8}px;
	padding-bottom: ${(props) => props.theme.mainPadding * .8}px;
	border-top: 1px solid ${(props) => props.theme.dividerColor};
	border-bottom: 1px solid ${(props) => props.theme.dividerColor};
	background-color: ${(props) => props.theme.selectedColor2};
	font-size: ${(props) => Math.round(props.theme.fontSize)}px;
	opacity: 0.58;
`;
exports.StyledSearchContainer = styled.div `
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	padding: ${(props) => props.theme.mainPadding}px;
	gap: ${(props) => props.theme.mainPadding * 0.5}px;
	border-bottom: 1px solid ${(props) => props.theme.dividerColor};
`;
exports.StyledSearchInput = styled.input `
	flex: 1;
	padding: ${(props) => props.theme.mainPadding * 0.5}px;
	border: 1px solid ${(props) => props.theme.dividerColor};
	border-radius: 4px;
	font-size: ${(props) => Math.round(props.theme.fontSize)}px;
	background-color: ${(props) => props.theme.backgroundColor};
	color: ${(props) => props.theme.color};
	box-sizing: border-box;

	&:focus {
		outline: none;
		border-color: ${(props) => props.theme.colorFocus};
	}
`;
exports.StyledClearButton = styled.button `
	padding: ${(props) => props.theme.mainPadding * 0.5}px;
	border: 1px solid ${(props) => props.theme.dividerColor};
	border-radius: 4px;
	background-color: ${(props) => props.theme.backgroundColor};
	color: ${(props) => props.theme.color};
	font-size: ${(props) => Math.round(props.theme.fontSize)}px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: ${(props) => props.theme.mainPadding * 2.5}px;

	&:hover {
		background-color: ${(props) => props.theme.backgroundColorHover2};
	}

	&:focus {
		outline: none;
		border-color: ${(props) => props.theme.colorFocus};
	}
`;
exports.StyledListItemLabel = styled.span `
	font-size: ${(props) => Math.round(props.theme.fontSize * 1.2)}px;
	font-weight: 500;
	color: ${(props) => props.theme.color2};
	white-space: nowrap;
	display: flex;
	flex: 1;
	align-items: center;
	user-select: none;
`;
exports.StyledListItemIcon = styled.i `
	font-size: ${(props) => Math.round(props.theme.fontSize * 1.4)}px;
	color: ${(props) => props.theme.color2};
	margin-right: ${(props) => props.theme.mainPadding / 1.5}px;
`;
function Sidebar(props) {
    const buttonRefs = (0, react_1.useRef)([]);
    // Making a tabbed region accessible involves supporting keyboard interaction.
    // See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ for details
    const onKeyDown = (0, react_1.useCallback)((event) => {
        const selectedIndex = props.sections.findIndex(section => section.name === props.selection);
        let newIndex = selectedIndex;
        if (event.code === 'ArrowUp') {
            newIndex--;
        }
        else if (event.code === 'ArrowDown') {
            newIndex++;
        }
        else if (event.code === 'Home') {
            newIndex = 0;
        }
        else if (event.code === 'End') {
            newIndex = props.sections.length - 1;
        }
        if (newIndex < 0)
            newIndex += props.sections.length;
        newIndex %= props.sections.length;
        if (newIndex !== selectedIndex) {
            event.preventDefault();
            props.onSelectionChange({ section: props.sections[newIndex] });
            const targetButton = buttonRefs.current[newIndex];
            if (targetButton) {
                (0, focusHandler_1.focus)('Sidebar', targetButton);
            }
        }
    }, [props.sections, props.selection, props.onSelectionChange]);
    const buttons = [];
    function renderButton(section, index) {
        const selected = props.selection === section.name;
        const hasMatches = !props.filteredSections || props.filteredSections.has(section.name);
        const isSearching = props.searchQuery && props.searchQuery.length > 0;
        const disabled = isSearching && !hasMatches;
        return (React.createElement(exports.StyledListItem, { key: section.name, href: '#', role: 'tab', ref: (item) => { buttonRefs.current[index] = item; }, id: `setting-tab-${section.name}`, "aria-controls": `setting-section-${section.name}`, "aria-selected": selected, tabIndex: selected ? 0 : -1, isSubSection: Setting_2.default.isSubSection(section.name), selected: selected, onClick: () => { if (!disabled)
                props.onSelectionChange({ section: section }); }, onKeyDown: onKeyDown, style: { opacity: disabled ? 0.4 : 0.8, cursor: disabled ? 'not-allowed' : 'default', pointerEvents: disabled ? 'none' : 'auto' } },
            React.createElement(exports.StyledListItemIcon, { className: Setting_2.default.sectionNameToIcon(section.name, Setting_1.AppType.Desktop), role: 'img', "aria-hidden": 'true' }),
            React.createElement(exports.StyledListItemLabel, null,
                React.createElement(HighlightedText_1.default, { text: Setting_2.default.sectionNameToLabel(section.name), searchQuery: props.searchQuery }))));
    }
    function renderDivider(key) {
        return (React.createElement(exports.StyledDivider, { key: key }, (0, locale_1._)('Plugins')));
    }
    let pluginDividerAdded = false;
    let index = 0;
    for (const section of props.sections) {
        if (section.source === Setting_1.SettingSectionSource.Plugin && !pluginDividerAdded) {
            buttons.push(renderDivider('divider-plugins'));
            pluginDividerAdded = true;
        }
        buttons.push(renderButton(section, index));
        index++;
    }
    const searchContent = props.searchQuery !== undefined ? (React.createElement(exports.StyledSearchContainer, null,
        React.createElement(exports.StyledSearchInput, { type: 'text', placeholder: (0, locale_1._)('Search...'), value: props.searchQuery, onChange: (e) => { var _a; return (_a = props.onSearchQueryChange) === null || _a === void 0 ? void 0 : _a.call(props, e.target.value); }, "aria-label": (0, locale_1._)('Search settings') }),
        props.searchQuery && (React.createElement(exports.StyledClearButton, { onClick: () => { var _a; return (_a = props.onClearSearch) === null || _a === void 0 ? void 0 : _a.call(props); }, "aria-label": (0, locale_1._)('Clear search'), title: (0, locale_1._)('Clear search') }, "\u2715")))) : null;
    return (React.createElement(exports.StyledRoot, { className: 'settings-sidebar _scrollbar2', role: 'tablist' },
        searchContent,
        buttons));
}
//# sourceMappingURL=Sidebar.js.map