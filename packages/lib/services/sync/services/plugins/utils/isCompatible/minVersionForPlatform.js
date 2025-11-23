"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../../../../models/Setting");
const getDefaultPlatforms_1 = require("./getDefaultPlatforms");
// Returns false if the platform isn't supported at all,
const minVersionForPlatform = (appPlatform, manifest) => {
    let platforms = manifest.platforms;
    if (!platforms || platforms.length === 0) {
        platforms = (0, getDefaultPlatforms_1.default)(manifest.id);
    }
    const supported = platforms.length === 0 || platforms.includes(appPlatform);
    if (!supported) {
        return false;
    }
    if (appPlatform === Setting_1.AppType.Mobile && !!manifest.app_min_version_mobile) {
        return manifest.app_min_version_mobile;
    }
    return manifest.app_min_version;
};
exports.default = minVersionForPlatform;
