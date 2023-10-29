"use strict";
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.md5 = void 0;
const crypto_1 = require("crypto");
function md5(string) {
    return (0, crypto_1.createHash)('md5').update(string).digest('hex');
}
exports.md5 = md5;
//# sourceMappingURL=crypto.js.map