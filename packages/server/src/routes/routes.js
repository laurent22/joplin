"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const batch_1 = require("./api/batch");
const batch_items_1 = require("./api/batch_items");
const debug_1 = require("./api/debug");
const events_1 = require("./api/events");
const items_1 = require("./api/items");
const locks_1 = require("./api/locks");
const ping_1 = require("./api/ping");
const sessions_1 = require("./api/sessions");
const shares_1 = require("./api/shares");
const share_users_1 = require("./api/share_users");
const users_1 = require("./api/users");
const dashboard_1 = require("./admin/dashboard");
const emails_1 = require("./admin/emails");
const tasks_1 = require("./admin/tasks");
const user_deletions_1 = require("./admin/user_deletions");
const users_2 = require("./admin/users");
const changes_1 = require("./index/changes");
const help_1 = require("./index/help");
const home_1 = require("./index/home");
const items_2 = require("./index/items");
const login_1 = require("./index/login");
const logout_1 = require("./index/logout");
const notifications_1 = require("./index/notifications");
const password_1 = require("./index/password");
const privacy_1 = require("./index/privacy");
const shares_2 = require("./index/shares");
const signup_1 = require("./index/signup");
const stripe_1 = require("./index/stripe");
const terms_1 = require("./index/terms");
const upgrade_1 = require("./index/upgrade");
const users_3 = require("./index/users");
const default_1 = require("./default");
const routes = {
    'api/batch_items': batch_items_1.default,
    'api/batch': batch_1.default,
    'api/debug': debug_1.default,
    'api/events': events_1.default,
    'api/items': items_1.default,
    'api/locks': locks_1.default,
    'api/ping': ping_1.default,
    'api/sessions': sessions_1.default,
    'api/share_users': share_users_1.default,
    'api/shares': shares_1.default,
    'api/users': users_1.default,
    'admin/dashboard': dashboard_1.default,
    'admin/emails': emails_1.default,
    'admin/tasks': tasks_1.default,
    'admin/user_deletions': user_deletions_1.default,
    'admin/users': users_2.default,
    'changes': changes_1.default,
    'help': help_1.default,
    'home': home_1.default,
    'items': items_2.default,
    'login': login_1.default,
    'logout': logout_1.default,
    'notifications': notifications_1.default,
    'password': password_1.default,
    'privacy': privacy_1.default,
    'shares': shares_2.default,
    'signup': signup_1.default,
    'stripe': stripe_1.default,
    'terms': terms_1.default,
    'upgrade': upgrade_1.default,
    'users': users_3.default,
    '': default_1.default,
};
exports.default = routes;
//# sourceMappingURL=routes.js.map