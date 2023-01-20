"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const requestUtils_1 = require("../../utils/requestUtils");
const errors_1 = require("../../utils/errors");
const defaultView_1 = require("../../utils/defaultView");
const UserModel_1 = require("../../models/UserModel");
const strings_1 = require("../../utils/strings");
const user_1 = require("../../models/utils/user");
const config_1 = require("../../config");
const htmlUtils_1 = require("../../utils/htmlUtils");
const stripe_1 = require("../../utils/stripe");
const router = new Router_1.default(types_1.RouteType.Web);
function setupMessageHtml() {
    if ((0, config_1.default)().isJoplinCloud) {
        return `In this screen, select "<strong>${(0, htmlUtils_1.escapeHtml)((0, config_1.default)().appName)}</strong>" as a synchronisation target and enter your username and password`;
    }
    else {
        return `In this screen, select "<strong>Joplin Server</strong>" as a synchronisation target, then enter the URL <strong>${(0, config_1.default)().apiBaseUrl}</strong> and your username and password`;
    }
}
router.get('home', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    (0, requestUtils_1.contextSessionId)(ctx);
    if (ctx.method === 'GET') {
        const user = ctx.joplin.owner;
        const subscription = yield ctx.joplin.models.subscription().byUserId(user.id);
        const view = (0, defaultView_1.default)('home', 'Home');
        view.content = {
            userProps: [
                {
                    label: 'Account Type',
                    value: (0, UserModel_1.accountTypeToString)(user.account_type),
                    show: true,
                },
                {
                    label: 'Is Admin',
                    value: (0, strings_1.yesOrNo)(user.is_admin),
                    show: !!user.is_admin,
                },
                {
                    label: 'Max Item Size',
                    value: (0, strings_1.formatMaxItemSize)(user),
                    show: true,
                },
                {
                    label: 'Total Size',
                    classes: [(0, user_1.totalSizeClass)(user)],
                    value: `${(0, strings_1.formatTotalSize)(user)} (${(0, strings_1.formatTotalSizePercent)(user)})`,
                    show: true,
                },
                {
                    label: 'Max Total Size',
                    value: (0, strings_1.formatMaxTotalSize)(user),
                    show: true,
                },
                {
                    label: 'Can Publish Note',
                    value: (0, strings_1.yesOrNo)(true),
                    show: true,
                },
                {
                    label: 'Can Share Notebook',
                    value: (0, strings_1.yesOrNo)((0, user_1.getCanShareFolder)(user)),
                    show: true,
                },
            ],
            showUpgradeProButton: subscription && user.account_type === UserModel_1.AccountType.Basic,
            showBetaMessage: yield (0, stripe_1.isBetaUser)(ctx.joplin.models, user.id),
            betaExpiredDays: (0, stripe_1.betaUserTrialPeriodDays)(user.created_time, 0, 0),
            betaStartSubUrl: (0, stripe_1.betaStartSubUrl)(user.email, user.account_type),
            setupMessageHtml: setupMessageHtml(),
        };
        view.cssFiles = ['index/home'];
        return view;
    }
    throw new errors_1.ErrorMethodNotAllowed();
}));
exports.default = router;
//# sourceMappingURL=home.js.map