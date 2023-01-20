"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTotalSize = exports.formatTotalSizePercent = exports.formatMaxTotalSize = exports.formatMaxItemSize = exports.nothing = exports.yesOrNo = void 0;
const user_1 = require("../models/utils/user");
const bytes_1 = require("./bytes");
function yesOrNo(value) {
    return value ? 'yes' : 'no';
}
exports.yesOrNo = yesOrNo;
function nothing() {
    return '';
}
exports.nothing = nothing;
function formatMaxItemSize(user) {
    const size = (0, user_1.getMaxItemSize)(user);
    return size ? (0, bytes_1.formatBytes)(size) : '∞';
}
exports.formatMaxItemSize = formatMaxItemSize;
function formatMaxTotalSize(user) {
    const size = (0, user_1.getMaxTotalItemSize)(user);
    return size ? (0, bytes_1.formatBytes)(size) : '∞';
}
exports.formatMaxTotalSize = formatMaxTotalSize;
function formatTotalSizePercent(user) {
    return `${Math.round((0, user_1.totalSizePercent)(user) * 100)}%`;
}
exports.formatTotalSizePercent = formatTotalSizePercent;
function formatTotalSize(user) {
    return (0, bytes_1.formatBytes)(user.total_item_size);
}
exports.formatTotalSize = formatTotalSize;
//# sourceMappingURL=strings.js.map