"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compare_versions_1 = require("compare-versions");
const minVersionForPlatform_1 = require("./minVersionForPlatform");
const isVersionCompatible = (appVersion, manifestMinVersion) => {
    return (0, compare_versions_1.compareVersions)(appVersion, manifestMinVersion) >= 0;
};
const isCompatible = (appVersion, appType, manifest) => {
    const minVersion = (0, minVersionForPlatform_1.default)(appType, manifest);
    return minVersion && isVersionCompatible(appVersion, minVersion);
};
exports.default = isCompatible;
