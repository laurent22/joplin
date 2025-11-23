"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("../../models/Setting");
exports.default = (settings) => {
    const globalSettings = {};
    const localSettings = {};
    for (const [k, v] of Object.entries(settings)) {
        const md = Setting_1.default.settingMetadata(k);
        if (md.isGlobal) {
            globalSettings[k] = v;
        }
        else {
            localSettings[k] = v;
        }
    }
    return { globalSettings, localSettings };
};
