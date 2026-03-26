"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateState = exports.InstallState = void 0;
exports.default = default_1;
const React = require("react");
const react_1 = require("react");
const locale_1 = require("@joplin/lib/locale");
const styled_components_1 = require("styled-components");
const ToggleButton_1 = require("../../../lib/ToggleButton/ToggleButton");
const Button_1 = require("../../../Button/Button");
const bridge_1 = require("../../../../services/bridge");
const PluginService_1 = require("@joplin/lib/services/plugins/PluginService");
const getPluginHelpUrl_1 = require("@joplin/lib/services/plugins/utils/getPluginHelpUrl");
var InstallState;
(function (InstallState) {
    InstallState[InstallState["NotInstalled"] = 1] = "NotInstalled";
    InstallState[InstallState["Installing"] = 2] = "Installing";
    InstallState[InstallState["Installed"] = 3] = "Installed";
})(InstallState || (exports.InstallState = InstallState = {}));
var UpdateState;
(function (UpdateState) {
    UpdateState[UpdateState["Idle"] = 1] = "Idle";
    UpdateState[UpdateState["CanUpdate"] = 2] = "CanUpdate";
    UpdateState[UpdateState["Updating"] = 3] = "Updating";
    UpdateState[UpdateState["HasBeenUpdated"] = 4] = "HasBeenUpdated";
})(UpdateState || (exports.UpdateState = UpdateState = {}));
function manifestToItem(manifest) {
    return {
        manifest: manifest,
        installed: true,
        enabled: true,
        deleted: false,
        devMode: false,
        builtIn: false,
        hasBeenUpdated: false,
    };
}
const CellRoot = styled_components_1.default.div `
	display: flex;
	box-sizing: border-box;
	background-color: ${props => props.theme.backgroundColor};
	flex-direction: column;
	align-items: stretch;
	padding: 15px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 6px;
	width: 320px;
	margin-right: 20px;
	margin-bottom: 20px;
	box-shadow: 1px 1px 3px rgba(0,0,0,0.2);

	opacity: ${props => props.isCompatible ? '1' : '0.6'};
`;
const CellTop = styled_components_1.default.div `
	display: flex;
	flex-direction: row;
	width: 100%;
	margin-bottom: 10px;
`;
const CellContent = styled_components_1.default.div `
	display: flex;
	margin-bottom: 10px;
	flex: 1;
`;
const CellFooter = styled_components_1.default.div `
	display: flex;
	flex-direction: row;
`;
const NeedUpgradeMessage = styled_components_1.default.span `
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorWarn};
	font-size: ${props => props.theme.fontSize}px;
`;
const BoxedLabel = styled_components_1.default.div `
	border: 1px solid ${props => props.theme.color};
	border-radius: 4px;
	padding: 4px 6px;
	font-size: ${props => props.theme.fontSize * 0.75}px;
	color: ${props => props.theme.color};
	flex-grow: 0;
	height: min-content;
	margin-top: auto;
`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const StyledNameAndVersion = styled_components_1.default.div `
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: ${props => props.theme.fontSize}px;
	font-weight: bold;
	padding-right: 5px;
	flex: 1;
`;
const StyledName = styled_components_1.default.a `
	color: ${props => props.theme.color};

	&:hover {
		text-decoration: underline;
	}
`;
const StyledVersion = styled_components_1.default.span `
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize * 0.9}px;
`;
const StyledDescription = styled_components_1.default.div `
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize}px;
	line-height: 1.6em;
`;
const RecommendedBadge = styled_components_1.default.a `
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorWarn};
	font-size: ${props => props.theme.fontSize}px;
	border: 1px solid ${props => props.theme.colorWarn};
	padding: 5px;
	border-radius: 50px;
	opacity: 0.8;
	
	&:hover {
		opacity: 1;
	}
`;
function default_1(props) {
    const item = (0, react_1.useMemo)(() => {
        return props.item ? props.item : manifestToItem(props.manifest);
    }, [props.item, props.manifest]);
    const onNameClick = (0, react_1.useCallback)(() => {
        const manifest = item.manifest;
        void (0, bridge_1.default)().openExternal((0, getPluginHelpUrl_1.default)(manifest.id));
    }, [item]);
    const onRecommendedClick = (0, react_1.useCallback)(() => {
        void (0, bridge_1.default)().openExternal('https://github.com/joplin/plugins/blob/master/readme/recommended.md#recommended-plugins');
    }, []);
    // For plugins in dev mode things like enabling/disabling or
    // uninstalling them doesn't make sense, as that should be done by
    // adding/removing them from wherever they were loaded from.
    function renderToggleButton() {
        if (!props.onToggle)
            return null;
        if (item.devMode) {
            return React.createElement(BoxedLabel, null, "DEV");
        }
        return React.createElement(ToggleButton_1.default, { themeId: props.themeId, value: item.enabled, onToggle: () => props.onToggle({ item }), "aria-label": (0, locale_1._)('Enabled') });
    }
    function renderDeleteButton() {
        // Built-in plugins can only be disabled
        if (item.builtIn)
            return null;
        if (!props.onDelete)
            return null;
        return React.createElement(Button_1.default, { level: Button_1.ButtonLevel.Secondary, onClick: () => props.onDelete({ item }), title: (0, locale_1._)('Delete') });
    }
    function renderInstallButton() {
        if (!props.onInstall)
            return null;
        let title = (0, locale_1._)('Install');
        if (props.installState === InstallState.Installing)
            title = (0, locale_1._)('Installing...');
        if (props.installState === InstallState.Installed)
            title = (0, locale_1._)('Installed');
        return React.createElement(Button_1.default, { level: Button_1.ButtonLevel.Secondary, disabled: props.installState !== InstallState.NotInstalled, onClick: () => props.onInstall({ item }), title: title });
    }
    function renderUpdateButton() {
        if (!props.onUpdate)
            return null;
        let title = (0, locale_1._)('Update');
        if (props.updateState === UpdateState.Updating)
            title = (0, locale_1._)('Updating...');
        if (props.updateState === UpdateState.Idle)
            title = (0, locale_1._)('Updated');
        if (props.updateState === UpdateState.HasBeenUpdated)
            title = (0, locale_1._)('Updated');
        return React.createElement(Button_1.default, { ml: 1, level: Button_1.ButtonLevel.Recommended, onClick: () => props.onUpdate({ item }), title: title, disabled: props.updateState === UpdateState.HasBeenUpdated });
    }
    const renderDefaultPluginLabel = () => {
        if (item.builtIn) {
            return (React.createElement(BoxedLabel, null, (0, locale_1._)('Built-in')));
        }
        return null;
    };
    function renderFooter() {
        if (item.devMode)
            return null;
        if (!props.isCompatible) {
            return (React.createElement(CellFooter, null,
                React.createElement(NeedUpgradeMessage, null, PluginService_1.default.instance().describeIncompatibility(item.manifest))));
        }
        return (React.createElement(CellFooter, null,
            renderDeleteButton(),
            renderInstallButton(),
            renderUpdateButton(),
            React.createElement("div", { style: { display: 'flex', flex: 1 } }),
            renderDefaultPluginLabel()));
    }
    function renderRecommendedBadge() {
        if (props.onToggle)
            return null;
        if (!item.manifest._recommended)
            return null;
        return React.createElement(RecommendedBadge, { href: "#", title: (0, locale_1._)('The Joplin team has vetted this plugin and it meets our standards for security and performance.'), onClick: onRecommendedClick },
            React.createElement("i", { className: "fas fa-crown" }));
    }
    const nameLabelId = (0, react_1.useId)();
    return (React.createElement(CellRoot, { isCompatible: props.isCompatible, role: 'group', "aria-labelledby": nameLabelId },
        React.createElement(CellTop, null,
            React.createElement(StyledNameAndVersion, { mb: '5px' },
                React.createElement(StyledName, { onClick: onNameClick, href: "#", style: { marginRight: 5 }, id: nameLabelId },
                    item.manifest.name,
                    " ",
                    item.deleted ? (0, locale_1._)('(%s)', 'Deleted') : ''),
                React.createElement(StyledVersion, null,
                    "v",
                    item.manifest.version)),
            renderToggleButton(),
            renderRecommendedBadge()),
        React.createElement(CellContent, null,
            React.createElement(StyledDescription, null, item.manifest.description)),
        renderFooter()));
}
//# sourceMappingURL=PluginBox.js.map