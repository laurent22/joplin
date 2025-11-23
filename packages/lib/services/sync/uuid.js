"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customAlphabetSecure = exports.createNanoForInboxEmail = exports.uuidgen = exports.createSecureRandom = void 0;
const uuid_1 = require("uuid");
const non_secure_1 = require("nanoid/non-secure");
const nanoid_1 = require("nanoid");
Object.defineProperty(exports, "customAlphabetSecure", { enumerable: true, get: function () { return nanoid_1.customAlphabet; } });
// https://zelark.github.io/nano-id-cc/
// https://security.stackexchange.com/a/41749/1873
// > On the other hand, 128 bits (between 21 and 22 characters
// > alphanumeric) is beyond the reach of brute-force attacks pretty much
// > indefinitely
const nanoid = (0, non_secure_1.customAlphabet)('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 22);
exports.default = {
    create: function () {
        return (0, uuid_1.v4)().replace(/-/g, '');
    },
    createNano: function () {
        return nanoid();
    },
};
const createSecureRandom = (size = 32) => {
    return (0, nanoid_1.nanoid)(size);
};
exports.createSecureRandom = createSecureRandom;
const cachedUuidgen = {};
const createUuidgenCustomAlphabet = (length) => (0, non_secure_1.customAlphabet)('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length);
const getCachedUuidgen = (length) => {
    if (cachedUuidgen[length])
        return cachedUuidgen[length];
    cachedUuidgen[length] = createUuidgenCustomAlphabet(length);
    return cachedUuidgen[length];
};
const uuidgen = (length = 22) => {
    const cachedUuidgen = getCachedUuidgen(length);
    return cachedUuidgen();
};
exports.uuidgen = uuidgen;
const createNanoForInboxEmail = () => {
    return (0, non_secure_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyz', 8)();
};
exports.createNanoForInboxEmail = createNanoForInboxEmail;
