'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const Setting_1 = require('../../models/Setting');
exports.default = (rootSettings, subProfileSettings) => {
	const output = Object.assign({}, subProfileSettings);
	for (const k of Object.keys(output)) {
		const md = Setting_1.default.settingMetadata(k);
		if (md.isLocal) {
			delete output[k];
			if (k in rootSettings) { output[k] = rootSettings[k]; }
		}
	}
	for (const k of Object.keys(rootSettings)) {
		const md = Setting_1.default.settingMetadata(k);
		if (md.isLocal) {
			output[k] = rootSettings[k];
		}
	}
	return output;
};
// # sourceMappingURL=mergeRootAndSubProfileSettings.js.map
