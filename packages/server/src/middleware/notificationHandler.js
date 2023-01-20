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
const requestUtils_1 = require("../utils/requestUtils");
const types_1 = require("../services/database/types");
const db_1 = require("../db");
const locale_1 = require("@joplin/lib/locale");
const Logger_1 = require("@joplin/lib/Logger");
const NotificationModel_1 = require("../models/NotificationModel");
const urlUtils_1 = require("../utils/urlUtils");
const UserFlagModel_1 = require("../models/UserFlagModel");
const renderMarkdown_1 = require("../utils/renderMarkdown");
const logger = Logger_1.default.create('notificationHandler');
function handleChangeAdminPasswordNotification(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ctx.joplin.owner.is_admin)
            return;
        const defaultAdmin = yield ctx.joplin.models.user().login(db_1.defaultAdminEmail, db_1.defaultAdminPassword);
        const notificationModel = ctx.joplin.models.notification();
        if (defaultAdmin) {
            yield notificationModel.add(ctx.joplin.owner.id, NotificationModel_1.NotificationKey.ChangeAdminPassword, types_1.NotificationLevel.Important, (0, locale_1._)('The default admin password is insecure and has not been changed! [Change it now](%s)', (0, urlUtils_1.profileUrl)()));
        }
        else {
            yield notificationModel.setRead(ctx.joplin.owner.id, NotificationModel_1.NotificationKey.ChangeAdminPassword);
        }
    });
}
// Special notification that cannot be dismissed.
function handleUserFlags(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = ctx.joplin.owner;
        const flags = yield ctx.joplin.models.userFlag().allByUserId(ctx.joplin.owner.id);
        const flagStrings = flags.map(f => `- ${(0, UserFlagModel_1.userFlagToString)(f)}`).join('\n');
        if (!user.enabled || !user.can_upload) {
            return {
                id: 'accountDisabled',
                messageHtml: (0, renderMarkdown_1.default)(`Your account is disabled for the following reason(s):\n\n${flagStrings}\n\nPlease check the [help section](${(0, urlUtils_1.helpUrl)()}) for further information or contact support.`),
                levelClassName: levelClassName(types_1.NotificationLevel.Error),
                closeUrl: '',
            };
        }
        else if (flags.length) {
            // Actually currently all flags result in either disabled upload or
            // disabled account, but keeping that here anyway just in case.
            return {
                id: 'accountFlags',
                messageHtml: (0, renderMarkdown_1.default)(`The following issues have been detected on your account:\n\n${flagStrings}\n\nPlease check the [help section](${(0, urlUtils_1.helpUrl)()}) for further information or contact support.`),
                levelClassName: levelClassName(types_1.NotificationLevel.Important),
                closeUrl: '',
            };
        }
        return null;
    });
}
function handleConfirmEmailNotification(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ctx.joplin.owner)
            return null;
        if (!ctx.joplin.owner.email_confirmed) {
            return {
                id: 'confirmEmail',
                messageHtml: (0, renderMarkdown_1.default)('An email has been sent to you containing an activation link to complete your registration.\n\nMake sure you click it to secure your account and keep access to it.'),
                levelClassName: levelClassName(types_1.NotificationLevel.Important),
                closeUrl: '',
            };
        }
        return null;
    });
}
// async function handleSqliteInProdNotification(ctx: AppContext) {
// 	if (!ctx.joplin.owner.is_admin) return;
// 	const notificationModel = ctx.joplin.models.notification();
// 	if (config().database.client === 'sqlite3' && ctx.joplin.env === 'prod') {
// 		await notificationModel.add(
// 			ctx.joplin.owner.id,
// 			NotificationKey.UsingSqliteInProd
// 		);
// 	}
// }
function levelClassName(level) {
    if (level === types_1.NotificationLevel.Important)
        return 'is-warning';
    if (level === types_1.NotificationLevel.Normal)
        return 'is-info';
    if (level === types_1.NotificationLevel.Error)
        return 'is-danger';
    throw new Error(`Unknown level: ${level}`);
}
function makeNotificationViews(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const notificationModel = ctx.joplin.models.notification();
        const notifications = yield notificationModel.allUnreadByUserId(ctx.joplin.owner.id);
        const views = [];
        for (const n of notifications) {
            views.push({
                id: n.id,
                messageHtml: (0, renderMarkdown_1.default)(n.message),
                levelClassName: levelClassName(n.level),
                closeUrl: notificationModel.closeUrl(n.id),
            });
        }
        return views;
    });
}
// The role of this middleware is to inspect the system and to generate
// notifications for any issue it finds. It is only active for logged in users
// on the website. It is inactive for API calls.
function default_1(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        ctx.joplin.notifications = [];
        try {
            if ((0, requestUtils_1.isApiRequest)(ctx))
                return next();
            if (!ctx.joplin.owner)
                return next();
            yield handleChangeAdminPasswordNotification(ctx);
            yield handleConfirmEmailNotification(ctx);
            // await handleSqliteInProdNotification(ctx);
            const notificationViews = yield makeNotificationViews(ctx);
            const nonDismisableViews = [
                yield handleUserFlags(ctx),
                yield handleConfirmEmailNotification(ctx),
            ];
            for (const nonDismisableView of nonDismisableViews) {
                if (nonDismisableView)
                    notificationViews.push(nonDismisableView);
            }
            ctx.joplin.notifications = notificationViews;
        }
        catch (error) {
            logger.error(error);
        }
        return next();
    });
}
exports.default = default_1;
//# sourceMappingURL=notificationHandler.js.map