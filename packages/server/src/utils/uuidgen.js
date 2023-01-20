"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generate = require('nanoid/generate');
// https://zelark.github.io/nano-id-cc/
// https://security.stackexchange.com/a/41749/1873
// > On the other hand, 128 bits (between 21 and 22 characters
// > alphanumeric) is beyond the reach of brute-force attacks pretty much
// > indefinitely
function uuidgen(length = 22) {
    return generate('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length);
}
exports.default = uuidgen;
//# sourceMappingURL=uuidgen.js.map