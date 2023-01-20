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
exports.checkRepeatPassword = void 0;
const routeUtils_1 = require("../../utils/routeUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const types_2 = require("../../utils/types");
const requestUtils_1 = require("../../utils/requestUtils");
const errors_1 = require("../../utils/errors");
const config_1 = require("../../config");
const defaultView_1 = require("../../utils/defaultView");
const BaseModel_1 = require("../../models/BaseModel");
const NotificationModel_1 = require("../../models/NotificationModel");
const UserModel_1 = require("../../models/UserModel");
const urlUtils_1 = require("../../utils/urlUtils");
const stripe_1 = require("../../utils/stripe");
const csrf_1 = require("../../utils/csrf");
const time_1 = require("../../utils/time");
const cookies_1 = require("../../utils/cookies");
const UserFlagModel_1 = require("../../models/UserFlagModel");
const impersonate_1 = require("../admin/utils/users/impersonate");
const locale_1 = require("@joplin/lib/locale");
function checkRepeatPassword(fields, required) {
    if (fields.password) {
        if (fields.password !== fields.password2)
            throw new errors_1.ErrorUnprocessableEntity('Passwords do not match');
        return fields.password;
    }
    else {
        if (required)
            throw new errors_1.ErrorUnprocessableEntity('Password is required');
    }
    return '';
}
exports.checkRepeatPassword = checkRepeatPassword;
function makeUser(userId, fields) {
    const user = {};
    if ('email' in fields)
        user.email = fields.email;
    if ('full_name' in fields)
        user.full_name = fields.full_name;
    const password = checkRepeatPassword(fields, false);
    if (password)
        user.password = password;
    user.id = userId;
    return user;
}
const router = new Router_1.default(types_1.RouteType.Web);
router.get('users/:id', (path, ctx, formUser = null, error = null) => __awaiter(void 0, void 0, void 0, function* () {
    const owner = ctx.joplin.owner;
    if (path.id !== 'me' && path.id !== owner.id)
        throw new errors_1.ErrorForbidden();
    const models = ctx.joplin.models;
    const userId = owner.id;
    const user = yield models.user().load(userId);
    yield models.user().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Read, user);
    const postUrl = `${(0, config_1.default)().baseUrl}/users/me`;
    let userFlagViews = (yield models.userFlag().allByUserId(user.id)).map(f => {
        return Object.assign(Object.assign({}, f), { message: (0, UserFlagModel_1.userFlagToString)(f) });
    });
    userFlagViews.sort((a, b) => {
        return a.created_time < b.created_time ? +1 : -1;
    });
    if (!owner.is_admin)
        userFlagViews = [];
    const subscription = yield ctx.joplin.models.subscription().byUserId(userId);
    const view = (0, defaultView_1.default)('user', 'Profile');
    view.content.user = formUser ? formUser : user;
    view.content.buttonTitle = (0, locale_1._)('Update profile');
    view.content.error = error;
    view.content.postUrl = postUrl;
    view.content.csrfTag = yield (0, csrf_1.createCsrfTag)(ctx);
    if (subscription) {
        const lastPaymentAttempt = models.subscription().lastPaymentAttempt(subscription);
        view.content.subscription = subscription;
        view.content.showUpdateSubscriptionBasic = user.account_type !== UserModel_1.AccountType.Basic;
        view.content.showUpdateSubscriptionPro = user.account_type !== UserModel_1.AccountType.Pro;
        view.content.subLastPaymentStatus = lastPaymentAttempt.status;
        view.content.subLastPaymentDate = (0, time_1.formatDateTime)(lastPaymentAttempt.time);
    }
    view.content.hasFlags = !!userFlagViews.length;
    view.content.userFlagViews = userFlagViews;
    view.content.stripePortalUrl = (0, urlUtils_1.stripePortalUrl)();
    view.jsFiles.push('zxcvbn');
    view.cssFiles.push('index/user');
    if ((0, config_1.default)().accountTypesEnabled) {
        view.content.showAccountTypes = true;
        view.content.accountTypes = (0, UserModel_1.accountTypeOptions)().map((o) => {
            o.selected = user.account_type === o.value;
            return o;
        });
    }
    return view;
}));
router.publicSchemas.push('users/:id/confirm');
router.get('users/:id/confirm', (path, ctx, error = null) => __awaiter(void 0, void 0, void 0, function* () {
    const models = ctx.joplin.models;
    const userId = path.id;
    const token = ctx.query.token;
    if (!token)
        throw new errors_1.ErrorBadRequest('Missing token');
    const beforeChangingEmailHandler = (newEmail) => __awaiter(void 0, void 0, void 0, function* () {
        if ((0, config_1.default)().stripe.enabled) {
            try {
                yield (0, stripe_1.updateCustomerEmail)(models, userId, newEmail);
            }
            catch (error) {
                if (['no_sub', 'no_stripe_sub'].includes(error.code)) {
                    // ok - the user just doesn't have a subscription
                }
                else {
                    error.message = `Your Stripe subscription email could not be updated. As a result your account email has not been changed. Please try again or contact support. Error was: ${error.message}`;
                    throw error;
                }
            }
        }
    });
    if (ctx.query.confirm_email !== '0')
        yield models.user().processEmailConfirmation(userId, token, beforeChangingEmailHandler);
    const user = yield models.user().load(userId);
    if (!user)
        throw new errors_1.ErrorNotFound(`No such user: ${userId}`);
    if (user.must_set_password) {
        const view = Object.assign(Object.assign({}, (0, defaultView_1.default)('users/confirm', 'Confirmation')), { content: {
                user,
                error,
                token,
                postUrl: (0, urlUtils_1.confirmUrl)(userId, token),
            }, navbar: false });
        view.jsFiles.push('zxcvbn');
        return view;
    }
    else {
        yield models.token().deleteByValue(userId, token);
        yield models.notification().add(userId, NotificationModel_1.NotificationKey.EmailConfirmed);
        if (ctx.joplin.owner) {
            return (0, routeUtils_1.redirect)(ctx, `${(0, config_1.default)().baseUrl}/home`);
        }
        else {
            return (0, routeUtils_1.redirect)(ctx, `${(0, config_1.default)().baseUrl}/login`);
        }
    }
}));
router.post('users/:id/confirm', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = path.id;
    try {
        const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
        yield ctx.joplin.models.token().checkToken(userId, fields.token);
        const password = checkRepeatPassword(fields, true);
        yield ctx.joplin.models.user().save({ id: userId, password, must_set_password: 0 });
        yield ctx.joplin.models.token().deleteByValue(userId, fields.token);
        const session = yield ctx.joplin.models.session().createUserSession(userId);
        (0, cookies_1.cookieSet)(ctx, 'sessionId', session.id);
        yield ctx.joplin.models.notification().add(userId, NotificationModel_1.NotificationKey.PasswordSet);
        return (0, routeUtils_1.redirect)(ctx, `${(0, config_1.default)().baseUrl}/home`);
    }
    catch (error) {
        const endPoint = router.findEndPoint(types_2.HttpMethod.GET, 'users/:id/confirm');
        return endPoint.handler(path, ctx, error);
    }
}));
router.alias(types_2.HttpMethod.POST, 'users/:id', 'users');
router.post('users', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const owner = ctx.joplin.owner;
    if (path.id && path.id !== 'me' && path.id !== owner.id)
        throw new errors_1.ErrorForbidden();
    const models = ctx.joplin.models;
    let user = null;
    try {
        const body = yield (0, requestUtils_1.formParse)(ctx.req);
        const fields = body.fields;
        if (fields.id && fields.id !== owner.id)
            throw new errors_1.ErrorForbidden();
        user = makeUser(owner.id, fields);
        if (fields.post_button) {
            const userToSave = models.user().fromApiInput(user);
            yield models.user().checkIfAllowed(owner, BaseModel_1.AclAction.Update, userToSave);
            if (userToSave.email && userToSave.email !== owner.email) {
                yield models.user().initiateEmailChange(owner.id, userToSave.email);
                delete userToSave.email;
            }
            yield models.user().save(userToSave, { isNew: false });
            // When changing the password, we also clear all session IDs for
            // that user, except the current one (otherwise they would be
            // logged out).
            if (userToSave.password)
                yield models.session().deleteByUserId(userToSave.id, (0, requestUtils_1.contextSessionId)(ctx));
        }
        else if (fields.stop_impersonate_button) {
            yield (0, impersonate_1.stopImpersonating)(ctx);
            return (0, routeUtils_1.redirect)(ctx, (0, config_1.default)().baseUrl);
        }
        else {
            throw new Error('Invalid form button');
        }
        return (0, routeUtils_1.redirect)(ctx, `${(0, config_1.default)().baseUrl}/users/me`);
    }
    catch (error) {
        error.message = `Error: Your changes were not saved: ${error.message}`;
        if (error instanceof errors_1.ErrorForbidden)
            throw error;
        const endPoint = router.findEndPoint(types_2.HttpMethod.GET, 'users/:id');
        return endPoint.handler(path, ctx, user, error);
    }
}));
exports.default = router;
//# sourceMappingURL=users.js.map