"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBytes = exports.GB = exports.MB = exports.KB = void 0;
const prettyBytes = require('pretty-bytes');
exports.KB = 1024;
exports.MB = exports.KB * exports.KB;
exports.GB = exports.KB * exports.MB;
function formatBytes(bytes) {
    // To simplify we display the result with SI prefix, but removes the "i".
    // So 1024 bytes = 1 kB (and not 1 kiB)
    return prettyBytes(bytes, { binary: true }).replace(/i/g, '');
}
exports.formatBytes = formatBytes;
//# sourceMappingURL=bytes.js.map