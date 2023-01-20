"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminEmailUrl = exports.adminEmailsUrl = exports.adminTasksUrl = exports.adminUserUrl = exports.adminUsersUrl = exports.adminDashboardUrl = exports.userUrl = exports.adminUserDeletionsUrl = exports.loginUrl = exports.changesUrl = exports.itemsUrl = exports.homeUrl = exports.stripePortalUrl = exports.confirmUrl = exports.helpUrl = exports.profileUrl = exports.forgotPasswordUrl = exports.resetPasswordUrl = exports.stripOffQueryParameters = exports.setQueryParameters = void 0;
const url_1 = require("url");
const config_1 = require("../config");
function setQueryParameters(url, query) {
    if (!query)
        return url;
    const u = new url_1.URL(url);
    for (const k of Object.keys(query)) {
        u.searchParams.set(k, query[k]);
    }
    return u.toString();
}
exports.setQueryParameters = setQueryParameters;
function stripOffQueryParameters(url) {
    const s = url.split('?');
    if (s.length <= 1)
        return url;
    s.pop();
    return s.join('?');
}
exports.stripOffQueryParameters = stripOffQueryParameters;
function resetPasswordUrl(token) {
    return `${(0, config_1.default)().baseUrl}/password/reset${token ? `?token=${token}` : ''}`;
}
exports.resetPasswordUrl = resetPasswordUrl;
function forgotPasswordUrl() {
    return `${(0, config_1.default)().baseUrl}/password/forgot`;
}
exports.forgotPasswordUrl = forgotPasswordUrl;
function profileUrl() {
    return `${(0, config_1.default)().baseUrl}/users/me`;
}
exports.profileUrl = profileUrl;
function helpUrl() {
    return `${(0, config_1.default)().baseUrl}/help`;
}
exports.helpUrl = helpUrl;
function confirmUrl(userId, validationToken, autoConfirmEmail = true) {
    return `${(0, config_1.default)().baseUrl}/users/${userId}/confirm?token=${validationToken}${autoConfirmEmail ? '' : '&confirm_email=0'}`;
}
exports.confirmUrl = confirmUrl;
function stripePortalUrl() {
    return `${(0, config_1.default)().baseUrl}/stripe/portal`;
}
exports.stripePortalUrl = stripePortalUrl;
function homeUrl() {
    return `${(0, config_1.default)().baseUrl}/home`;
}
exports.homeUrl = homeUrl;
function itemsUrl() {
    return `${(0, config_1.default)().baseUrl}/items`;
}
exports.itemsUrl = itemsUrl;
function changesUrl() {
    return `${(0, config_1.default)().baseUrl}/changes`;
}
exports.changesUrl = changesUrl;
function loginUrl() {
    return `${(0, config_1.default)().baseUrl}/login`;
}
exports.loginUrl = loginUrl;
function adminUserDeletionsUrl() {
    return `${(0, config_1.default)().adminBaseUrl}/user_deletions`;
}
exports.adminUserDeletionsUrl = adminUserDeletionsUrl;
function userUrl(userId) {
    return `${(0, config_1.default)().baseUrl}/users/${userId}`;
}
exports.userUrl = userUrl;
function adminDashboardUrl() {
    return `${(0, config_1.default)().adminBaseUrl}/dashboard`;
}
exports.adminDashboardUrl = adminDashboardUrl;
function adminUsersUrl() {
    return `${(0, config_1.default)().adminBaseUrl}/users`;
}
exports.adminUsersUrl = adminUsersUrl;
function adminUserUrl(userId) {
    return `${(0, config_1.default)().adminBaseUrl}/users/${userId}`;
}
exports.adminUserUrl = adminUserUrl;
function adminTasksUrl() {
    return `${(0, config_1.default)().adminBaseUrl}/tasks`;
}
exports.adminTasksUrl = adminTasksUrl;
function adminEmailsUrl() {
    return `${(0, config_1.default)().adminBaseUrl}/emails`;
}
exports.adminEmailsUrl = adminEmailsUrl;
function adminEmailUrl(id) {
    return `${(0, config_1.default)().adminBaseUrl}/emails/${id}`;
}
exports.adminEmailUrl = adminEmailUrl;
//# sourceMappingURL=urlUtils.js.map