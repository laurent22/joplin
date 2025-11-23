"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validatePluginPlatforms = (platforms) => {
    if (!platforms) {
        return;
    }
    if (!Array.isArray(platforms) || platforms.some(p => typeof p !== 'string')) {
        throw new Error('If specified, platforms must be a string array');
    }
};
exports.default = validatePluginPlatforms;
