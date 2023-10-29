"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBase64 = exports.encodeBase64 = void 0;
function encodeBase64(s) {
    return Buffer.from(s).toString('base64');
}
exports.encodeBase64 = encodeBase64;
function decodeBase64(s) {
    return Buffer.from(s, 'base64').toString('utf8');
}
exports.decodeBase64 = decodeBase64;
//# sourceMappingURL=base64.js.map