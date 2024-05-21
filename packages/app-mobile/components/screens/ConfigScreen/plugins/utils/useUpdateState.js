"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateState = void 0;
const react_1 = require("react");
var UpdateState;
(function (UpdateState) {
    UpdateState[UpdateState["Idle"] = 1] = "Idle";
    UpdateState[UpdateState["CanUpdate"] = 2] = "CanUpdate";
    UpdateState[UpdateState["Updating"] = 3] = "Updating";
    UpdateState[UpdateState["HasBeenUpdated"] = 4] = "HasBeenUpdated";
})(UpdateState || (exports.UpdateState = UpdateState = {}));
const useUpdateState = ({ pluginId, pluginSettings, updatablePluginIds, updatingPluginIds }) => {
    return (0, react_1.useMemo)(() => {
        const settings = pluginSettings[pluginId];
        // Uninstalled
        if (!settings)
            return UpdateState.Idle;
        if (settings.hasBeenUpdated) {
            return UpdateState.HasBeenUpdated;
        }
        if (updatingPluginIds[pluginId]) {
            return UpdateState.Updating;
        }
        if (updatablePluginIds[pluginId]) {
            return UpdateState.CanUpdate;
        }
        return UpdateState.Idle;
    }, [pluginSettings, updatingPluginIds, pluginId, updatablePluginIds]);
};
exports.default = useUpdateState;
//# sourceMappingURL=useUpdateState.js.map