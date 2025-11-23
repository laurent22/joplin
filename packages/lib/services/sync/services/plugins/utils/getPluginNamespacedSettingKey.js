"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getPluginSettingKeyPrefix_1 = require("./getPluginSettingKeyPrefix");
// Ensures that the plugin settings and sections are within their own namespace,
// to prevent them from overwriting other plugin settings or the default
// settings.
exports.default = (pluginId, key) => {
    return `${(0, getPluginSettingKeyPrefix_1.default)(pluginId)}${key}`;
};
