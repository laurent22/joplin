'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const os_1 = require('os');
const path_utils_1 = require('./path-utils');
exports.default = (profileFromArgs, appName) => {
	let output = '';
	if (profileFromArgs) {
		output = profileFromArgs;
	} else if (process && process.env && process.env.PORTABLE_EXECUTABLE_DIR) {
		output = `${process.env.PORTABLE_EXECUTABLE_DIR}/JoplinProfile`;
	} else {
		output = `${(0, os_1.homedir)()}/.config/${appName}`;
	}
	return (0, path_utils_1.toSystemSlashes)(output, 'linux');
};
// # sourceMappingURL=determineProfileDir.js.map
