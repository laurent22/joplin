"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../../../models/Setting");
const getPluginNamespacedSettingKey_1 = require("./getPluginNamespacedSettingKey");
exports.default = (pluginId, key) => {
    return Setting_1.default.value((0, getPluginNamespacedSettingKey_1.default)(pluginId, key));
};
