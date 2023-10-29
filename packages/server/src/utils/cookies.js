"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieDelete = exports.cookieGet = exports.cookieSet = void 0;
const config_1 = require("../config");
function cookieSet(ctx, name, value) {
    ctx.cookies.set(name, value, {
        // Means that the cookies cannot be accessed from JavaScript
        httpOnly: true,
        // Can only be transferred over https
        secure: (0, config_1.default)().cookieSecure,
        // Prevent cookies from being sent in cross-site requests
        sameSite: true,
    });
}
exports.cookieSet = cookieSet;
function cookieGet(ctx, name) {
    return ctx.cookies.get(name);
}
exports.cookieGet = cookieGet;
function cookieDelete(ctx, name) {
    return cookieSet(ctx, name, '');
}
exports.cookieDelete = cookieDelete;
//# sourceMappingURL=cookies.js.map