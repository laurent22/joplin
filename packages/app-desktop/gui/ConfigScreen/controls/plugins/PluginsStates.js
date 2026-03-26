"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const React = require("react");
const react_1 = require("react");
const PluginService_1 = require("@joplin/lib/services/plugins/PluginService");
const locale_1 = require("@joplin/lib/locale");
const styled_components_1 = require("styled-components");
const SearchPlugins_1 = require("./SearchPlugins");
const PluginBox_1 = require("./PluginBox");
const Button_1 = require("../../../Button/Button");
const bridge_1 = require("../../../../services/bridge");
const immer_1 = require("immer");
const RepositoryApi_1 = require("@joplin/lib/services/plugins/RepositoryApi");
const Setting_1 = require("@joplin/lib/models/Setting");
const useOnInstallHandler_1 = require("@joplin/lib/components/shared/config/plugins/useOnInstallHandler");
const useOnDeleteHandler_1 = require("@joplin/lib/components/shared/config/plugins/useOnDeleteHandler");
const Logger_1 = require("@joplin/utils/Logger");
const StyledMessage_1 = require("../../../style/StyledMessage");
const StyledLink_1 = require("../../../style/StyledLink");
const SettingHeader_1 = require("../SettingHeader");
const SettingDescription_1 = require("../SettingDescription");
const { space } = require('styled-system');
const logger = Logger_1.default.create('PluginState');
const maxWidth = 320;
const Root = styled_components_1.default.div `
	display: flex;
	flex-direction: column;
`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const UserPluginsRoot = styled_components_1.default.div `
	${space}
	display: flex;
	flex-wrap: wrap;
`;
const ToolsButton = (0, styled_components_1.default)(Button_1.default) `
	margin-right: 6px;
`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const RepoApiErrorMessage = (0, styled_components_1.default)(StyledMessage_1.default) `
	max-width: ${props => props.maxWidth}px;
	margin-bottom: 10px;
`;
let repoApi_ = null;
function repoApi() {
    if (repoApi_)
        return repoApi_;
    const appInfo = { type: Setting_1.AppType.Desktop, version: PluginService_1.default.instance().appVersion };
    repoApi_ = RepositoryApi_1.default.ofDefaultJoplinRepo(Setting_1.default.value('tempDir'), appInfo, RepositoryApi_1.InstallMode.Default);
    // repoApi_ = new RepositoryApi('/Users/laurent/src/joplin-plugins-test', Setting.value('tempDir'));
    return repoApi_;
}
function usePluginItems(plugins, settings) {
    return (0, react_1.useMemo)(() => {
        const output = [];
        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            const setting = Object.assign(Object.assign({}, (0, PluginService_1.defaultPluginSetting)()), settings[pluginId]);
            output.push({
                manifest: plugin.manifest,
                installed: true,
                enabled: setting.enabled,
                deleted: setting.deleted,
                devMode: plugin.devMode,
                builtIn: plugin.builtIn,
                hasBeenUpdated: setting.hasBeenUpdated,
            });
        }
        output.sort((a, b) => {
            return a.manifest.name < b.manifest.name ? -1 : +1;
        });
        return output;
    }, [plugins, settings]);
}
function default_1(props) {
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [manifestsLoaded, setManifestsLoaded] = (0, react_1.useState)(false);
    const [updatingPluginsIds, setUpdatingPluginIds] = (0, react_1.useState)({});
    const [canBeUpdatedPluginIds, setCanBeUpdatedPluginIds] = (0, react_1.useState)({});
    const [repoApiError, setRepoApiError] = (0, react_1.useState)(null);
    const [fetchManifestTime, setFetchManifestTime] = (0, react_1.useState)(Date.now());
    const pluginService = PluginService_1.default.instance();
    const pluginSettings = (0, react_1.useMemo)(() => {
        return pluginService.unserializePluginSettings(props.value);
        // eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
    }, [props.value]);
    const pluginItems = usePluginItems(pluginService.plugins, pluginSettings);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        async function fetchManifests() {
            setManifestsLoaded(false);
            setRepoApiError(null);
            let loadError = null;
            try {
                await repoApi().initialize();
            }
            catch (error) {
                logger.error(error);
                loadError = error;
            }
            if (cancelled)
                return;
            if (loadError) {
                setManifestsLoaded(false);
                setRepoApiError(loadError);
            }
            else {
                setManifestsLoaded(true);
            }
        }
        void fetchManifests();
        return () => {
            cancelled = true;
        };
    }, [fetchManifestTime]);
    (0, react_1.useEffect)(() => {
        if (!manifestsLoaded)
            return () => { };
        let cancelled = false;
        async function fetchPluginIds() {
            // Built-in plugins can't be updated from the main repoApi
            const nonDefaultPlugins = pluginItems
                .filter(plugin => !plugin.builtIn)
                .map(p => p.manifest);
            const pluginIds = await repoApi().canBeUpdatedPlugins(nonDefaultPlugins);
            if (cancelled)
                return;
            const conv = {};
            for (const id of pluginIds) {
                conv[id] = true;
            }
            setCanBeUpdatedPluginIds(conv);
        }
        void fetchPluginIds();
        return () => {
            cancelled = true;
        };
    }, [manifestsLoaded, pluginItems, pluginService.appVersion]);
    const onToggle = (0, react_1.useCallback)((event) => {
        const item = event.item;
        const newSettings = (0, immer_1.produce)(pluginSettings, (draft) => {
            if (!draft[item.manifest.id])
                draft[item.manifest.id] = (0, PluginService_1.defaultPluginSetting)();
            draft[item.manifest.id].enabled = !draft[item.manifest.id].enabled;
        });
        props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
        // eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
    }, [pluginSettings, props.onChange]);
    const onInstall = (0, react_1.useCallback)(async () => {
        const result = await (0, bridge_1.default)().showOpenDialog({
            filters: [{ name: 'Joplin Plugin Archive', extensions: ['jpl'] }],
        });
        const filePath = result && result.length ? result[0] : null;
        if (!filePath)
            return;
        const plugin = await pluginService.installPlugin(filePath);
        const newSettings = (0, immer_1.produce)(pluginSettings, (draft) => {
            draft[plugin.manifest.id] = (0, PluginService_1.defaultPluginSetting)();
        });
        props.onChange({ value: pluginService.serializePluginSettings(newSettings) });
        // eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
    }, [pluginSettings, props.onChange]);
    const onBrowsePlugins = (0, react_1.useCallback)(() => {
        void (0, bridge_1.default)().openExternal('https://joplinapp.org/plugins/');
    }, []);
    const onPluginSettingsChange = (0, react_1.useCallback)((event) => {
        props.onChange({ value: pluginService.serializePluginSettings(event.value) });
    }, [pluginService, props.onChange]);
    const pluginSettingsRef = (0, react_1.useRef)(pluginSettings);
    pluginSettingsRef.current = pluginSettings;
    const onDelete = (0, useOnDeleteHandler_1.default)(pluginSettingsRef, onPluginSettingsChange, false);
    const onUpdate = (0, useOnInstallHandler_1.default)(setUpdatingPluginIds, pluginSettingsRef, repoApi, onPluginSettingsChange, true);
    const onToolsClick = (0, react_1.useCallback)(async () => {
        const template = [
            {
                label: (0, locale_1._)('Browse all plugins'),
                click: onBrowsePlugins,
            },
            {
                label: (0, locale_1._)('Install from file'),
                click: onInstall,
            },
        ];
        const menu = (0, bridge_1.default)().Menu.buildFromTemplate(template);
        menu.popup({ window: (0, bridge_1.default)().mainWindow() });
    }, [onInstall, onBrowsePlugins]);
    const onSearchQueryChange = (0, react_1.useCallback)((event) => {
        setSearchQuery(event.value);
    }, []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const onSearchPluginSettingsChange = (0, react_1.useCallback)((event) => {
        props.onChange({ value: pluginService.serializePluginSettings(event.value) });
        // eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
    }, [props.onChange]);
    function renderCells(items) {
        const output = [];
        for (const item of items) {
            if (item.deleted)
                continue;
            const isUpdating = updatingPluginsIds[item.manifest.id];
            const onUpdateHandler = canBeUpdatedPluginIds[item.manifest.id] ? onUpdate : null;
            let updateState = PluginBox_1.UpdateState.Idle;
            if (onUpdateHandler)
                updateState = PluginBox_1.UpdateState.CanUpdate;
            if (isUpdating)
                updateState = PluginBox_1.UpdateState.Updating;
            if (item.hasBeenUpdated)
                updateState = PluginBox_1.UpdateState.HasBeenUpdated;
            output.push(React.createElement(PluginBox_1.default, { key: item.manifest.id, item: item, themeId: props.themeId, updateState: updateState, isCompatible: PluginService_1.default.instance().isCompatible(item.manifest), onDelete: onDelete, onToggle: onToggle, onUpdate: onUpdateHandler }));
        }
        return output;
    }
    function renderUserPlugins(pluginItems) {
        const allDeleted = !pluginItems.find(it => it.deleted !== true);
        if (!pluginItems.length || allDeleted) {
            return (React.createElement(UserPluginsRoot, { mb: '10px' },
                React.createElement(SettingDescription_1.default, { text: (0, locale_1._)('You do not have any installed plugin.') })));
        }
        else {
            const nonDefaultPlugins = pluginItems.filter(item => !item.builtIn);
            const defaultPlugins = pluginItems.filter(item => item.builtIn);
            return (React.createElement(React.Fragment, null,
                React.createElement(UserPluginsRoot, null, renderCells(nonDefaultPlugins)),
                React.createElement(UserPluginsRoot, null, renderCells(defaultPlugins))));
        }
    }
    function renderSearchArea() {
        return (React.createElement("div", { style: { marginBottom: 0 } },
            React.createElement(SearchPlugins_1.default, { disabled: !manifestsLoaded, maxWidth: maxWidth, themeId: props.themeId, searchQuery: searchQuery, pluginSettings: pluginSettings, onSearchQueryChange: onSearchQueryChange, onPluginSettingsChange: onSearchPluginSettingsChange, repoApi: repoApi })));
    }
    function renderRepoApiError() {
        if (!repoApiError)
            return null;
        return React.createElement(RepoApiErrorMessage, { maxWidth: maxWidth, type: "error" },
            (0, locale_1._)('Could not connect to plugin repository.'),
            React.createElement("br", null),
            React.createElement("br", null),
            "- ",
            React.createElement(StyledLink_1.default, { href: "#", onClick: () => { setFetchManifestTime(Date.now()); } }, (0, locale_1._)('Try again')),
            React.createElement("br", null),
            React.createElement("br", null),
            "- ",
            React.createElement(StyledLink_1.default, { href: "#", onClick: onBrowsePlugins }, (0, locale_1._)('Browse all plugins')));
    }
    function renderBottomArea() {
        if (searchQuery)
            return null;
        return (React.createElement("div", null,
            renderRepoApiError(),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'row', maxWidth } },
                React.createElement(ToolsButton, { size: Button_1.ButtonSize.Small, tooltip: (0, locale_1._)('Plugin tools'), iconName: "fas fa-cog", level: Button_1.ButtonLevel.Secondary, onClick: onToolsClick }),
                React.createElement("div", { style: { display: 'flex', flex: 1 } },
                    React.createElement(SettingHeader_1.default, { text: (0, locale_1._)('Manage your plugins') }))),
            renderUserPlugins(pluginItems)));
    }
    return (React.createElement(Root, null,
        renderSearchArea(),
        renderBottomArea()));
}
//# sourceMappingURL=PluginsStates.js.map