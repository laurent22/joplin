"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalSizeClass = exports.totalSizePercent = exports.getMaxTotalItemSize = exports.getMaxItemSize = exports.getCanShareFolder = void 0;
const UserModel_1 = require("../UserModel");
function getCanShareFolder(user) {
    if (!('account_type' in user) || !('can_share_folder' in user))
        throw new Error('Missing account_type or can_share_folder property');
    const account = (0, UserModel_1.accountByType)(user.account_type);
    return user.can_share_folder !== null ? user.can_share_folder : account.can_share_folder;
}
exports.getCanShareFolder = getCanShareFolder;
function getMaxItemSize(user) {
    if (!('account_type' in user) || !('max_item_size' in user))
        throw new Error('Missing account_type or max_item_size property');
    const account = (0, UserModel_1.accountByType)(user.account_type);
    return user.max_item_size !== null ? user.max_item_size : account.max_item_size;
}
exports.getMaxItemSize = getMaxItemSize;
function getMaxTotalItemSize(user) {
    if (!('account_type' in user) || !('max_total_item_size' in user))
        throw new Error('Missing account_type or max_total_item_size property');
    const account = (0, UserModel_1.accountByType)(user.account_type);
    return user.max_total_item_size !== null ? user.max_total_item_size : account.max_total_item_size;
}
exports.getMaxTotalItemSize = getMaxTotalItemSize;
function totalSizePercent(user) {
    const maxTotalSize = getMaxTotalItemSize(user);
    if (!maxTotalSize)
        return 0;
    return user.total_item_size / maxTotalSize;
}
exports.totalSizePercent = totalSizePercent;
function totalSizeClass(user) {
    const d = totalSizePercent(user);
    if (d >= 1)
        return 'is-danger';
    if (d >= .7)
        return 'is-warning';
    return '';
}
exports.totalSizeClass = totalSizeClass;
//# sourceMappingURL=user.js.map