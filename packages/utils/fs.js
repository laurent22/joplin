"use strict";
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globSync = void 0;
const glob_1 = require("glob");
// Wraps glob.sync but with good default options so that it works across
// platforms and with consistent sorting.
const globSync = (pattern, options) => {
    let output = (0, glob_1.sync)(pattern, options);
    output = output.map(f => f.replace(/\\/g, '/'));
    output.sort();
    return output;
};
exports.globSync = globSync;
//# sourceMappingURL=fs.js.map