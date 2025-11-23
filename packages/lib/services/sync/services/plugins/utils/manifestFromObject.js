"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = manifestFromObject;
const validatePluginId_1 = require("./validatePluginId");
const validatePluginPlatforms_1 = require("./validatePluginPlatforms");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function manifestFromObject(o) {
    const getString = (name, required = true, defaultValue = '') => {
        if (required && !o[name])
            throw new Error(`Missing required field: ${name}`);
        if (!o[name])
            return defaultValue;
        if (typeof o[name] !== 'string')
            throw new Error(`Field must be a string: ${name}`);
        return o[name];
    };
    const getNumber = (name, required = true) => {
        if (required && !o[name])
            throw new Error(`Missing required field: ${name}`);
        if (!o[name])
            return 0;
        if (typeof o[name] !== 'number')
            throw new Error(`Field must be a number: ${name}`);
        return o[name];
    };
    const getStrings = (name, required = true, defaultValue = []) => {
        if (required && !o[name])
            throw new Error(`Missing required field: ${name}`);
        if (!o[name])
            return defaultValue;
        if (!Array.isArray(o[name]))
            throw new Error(`Field must be an array: ${name}`);
        return o[name];
    };
    const getBoolean = (name, required = true, defaultValue = false) => {
        if (required && !o[name])
            throw new Error(`Missing required field: ${name}`);
        if (!o[name])
            return defaultValue;
        if (typeof o[name] !== 'boolean')
            throw new Error(`Field must be a boolean: ${name}`);
        return o[name];
    };
    const getScreenshots = (defaultValue = []) => {
        if (!o.screenshots)
            return defaultValue;
        return o.screenshots;
    };
    const getPromoTile = () => {
        return o.promo_tile || null;
    };
    const getIcons = () => {
        if (!o.icons)
            return null;
        for (const size of [16, 32, 48, 128]) {
            if (o.icons[size])
                return o.icons;
        }
        return null;
    };
    const permissions = [];
    const manifest = {
        manifest_version: getNumber('manifest_version', true),
        id: getString('id', true),
        name: getString('name', true),
        version: getString('version', true),
        app_min_version: getString('app_min_version', true),
        app_min_version_mobile: getString('app_min_version', false),
        platforms: getStrings('platforms', false),
        author: getString('author', false),
        description: getString('description', false),
        homepage_url: getString('homepage_url', false),
        repository_url: getString('repository_url', false),
        keywords: getStrings('keywords', false),
        categories: getStrings('categories', false),
        screenshots: getScreenshots(),
        permissions: permissions,
        icons: getIcons(),
        promo_tile: getPromoTile(),
        _recommended: getBoolean('_recommended', false, false),
    };
    (0, validatePluginId_1.default)(manifest.id);
    (0, validatePluginPlatforms_1.default)(manifest.platforms);
    if (o.permissions) {
        for (const p of o.permissions) {
            manifest.permissions.push(p);
        }
    }
    return manifest;
}
