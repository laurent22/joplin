"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const useOnDeleteHandler_1 = require("@joplin/lib/components/shared/config/plugins/useOnDeleteHandler");
const useOnInstallHandler_1 = require("@joplin/lib/components/shared/config/plugins/useOnInstallHandler");
const react_1 = require("react");
const usePluginCallbacks = (props) => {
    const onPluginSettingsChange = (0, react_1.useCallback)((event) => {
        props.updatePluginStates(event.value);
    }, [props.updatePluginStates]);
    const updatePluginEnabled = (0, react_1.useCallback)((pluginId, enabled) => {
        const newSettings = Object.assign({}, props.pluginSettings);
        newSettings[pluginId].enabled = enabled;
        props.updatePluginStates(newSettings);
    }, [props.pluginSettings, props.updatePluginStates]);
    const onToggle = (0, react_1.useCallback)((event) => {
        const pluginId = event.item.manifest.id;
        const settings = props.pluginSettings[pluginId];
        updatePluginEnabled(pluginId, !settings.enabled);
    }, [props.pluginSettings, updatePluginEnabled]);
    const onDelete = (0, useOnDeleteHandler_1.default)(props.pluginSettings, onPluginSettingsChange, true);
    const [updatingPluginIds, setUpdatingPluginIds] = (0, react_1.useState)({});
    const onUpdate = (0, useOnInstallHandler_1.default)(setUpdatingPluginIds, props.pluginSettings, props.repoApi, onPluginSettingsChange, true);
    const [installingPluginIds, setInstallingPluginIds] = (0, react_1.useState)({});
    const onInstall = (0, useOnInstallHandler_1.default)(setInstallingPluginIds, props.pluginSettings, props.repoApi, onPluginSettingsChange, false);
    const callbacks = (0, react_1.useMemo)(() => {
        return {
            onToggle,
            onDelete,
            onUpdate,
            onInstall,
        };
    }, [onToggle, onDelete, onUpdate]);
    return {
        callbacks,
        updatingPluginIds,
        installingPluginIds,
    };
};
exports.default = usePluginCallbacks;
//# sourceMappingURL=usePluginCallbacks.js.map