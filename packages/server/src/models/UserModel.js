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
exports.accountTypeToString = exports.accountTypeOptions = exports.accountByType = exports.AccountType = void 0;
const BaseModel_1 = require("./BaseModel");
const types_1 = require("../services/database/types");
const auth = require("../utils/auth");
const errors_1 = require("../utils/errors");
const BaseModel_2 = require("@joplin/lib/BaseModel");
const locale_1 = require("@joplin/lib/locale");
const bytes_1 = require("../utils/bytes");
const joplinUtils_1 = require("../utils/joplinUtils");
const user_1 = require("./utils/user");
const zxcvbn = require("zxcvbn");
const urlUtils_1 = require("../utils/urlUtils");
const users_1 = require("../routes/index/users");
const accountConfirmationTemplate_1 = require("../views/emails/accountConfirmationTemplate");
const resetPasswordTemplate_1 = require("../views/emails/resetPasswordTemplate");
const stripe_1 = require("../utils/stripe");
const endOfBetaTemplate_1 = require("../views/emails/endOfBetaTemplate");
const Logger_1 = require("@joplin/lib/Logger");
const paymentFailedUploadDisabledTemplate_1 = require("../views/emails/paymentFailedUploadDisabledTemplate");
const oversizedAccount1_1 = require("../views/emails/oversizedAccount1");
const oversizedAccount2_1 = require("../views/emails/oversizedAccount2");
const dayjs = require("dayjs");
const SubscriptionModel_1 = require("./SubscriptionModel");
const time_1 = require("../utils/time");
const paymentFailedAccountDisabledTemplate_1 = require("../views/emails/paymentFailedAccountDisabledTemplate");
const changeEmailConfirmationTemplate_1 = require("../views/emails/changeEmailConfirmationTemplate");
const changeEmailNotificationTemplate_1 = require("../views/emails/changeEmailNotificationTemplate");
const NotificationModel_1 = require("./NotificationModel");
const prettyBytes = require("pretty-bytes");
const types_2 = require("../utils/types");
const logger = Logger_1.default.create('UserModel');
var AccountType;
(function (AccountType) {
    AccountType[AccountType["Default"] = 0] = "Default";
    AccountType[AccountType["Basic"] = 1] = "Basic";
    AccountType[AccountType["Pro"] = 2] = "Pro";
})(AccountType = exports.AccountType || (exports.AccountType = {}));
function accountByType(accountType) {
    const types = [
        {
            account_type: AccountType.Default,
            can_share_folder: 1,
            max_item_size: 0,
            max_total_item_size: 0,
        },
        {
            account_type: AccountType.Basic,
            can_share_folder: 0,
            max_item_size: 10 * bytes_1.MB,
            max_total_item_size: 1 * bytes_1.GB,
        },
        {
            account_type: AccountType.Pro,
            can_share_folder: 1,
            max_item_size: 200 * bytes_1.MB,
            max_total_item_size: 10 * bytes_1.GB,
        },
    ];
    const type = types.find(a => a.account_type === accountType);
    if (!type)
        throw new Error(`Invalid account type: ${accountType}`);
    return type;
}
exports.accountByType = accountByType;
function accountTypeOptions() {
    return [
        {
            value: AccountType.Default,
            label: accountTypeToString(AccountType.Default),
        },
        {
            value: AccountType.Basic,
            label: accountTypeToString(AccountType.Basic),
        },
        {
            value: AccountType.Pro,
            label: accountTypeToString(AccountType.Pro),
        },
    ];
}
exports.accountTypeOptions = accountTypeOptions;
function accountTypeToString(accountType) {
    if (accountType === AccountType.Default)
        return 'Default';
    if (accountType === AccountType.Basic)
        return 'Basic';
    if (accountType === AccountType.Pro)
        return 'Pro';
    throw new Error(`Invalid type: ${accountType}`);
}
exports.accountTypeToString = accountTypeToString;
class UserModel extends BaseModel_1.default {
    get tableName() {
        return 'users'; // we assume all users belong to the `users` table
    }
    loadByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.formatValues({ email: email });
            return this.db(this.tableName).where(user).first();
        });
    }
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.loadByEmail(email);
            if (!user)
                return null;
            if (!auth.checkPassword(password, user.password))
                return null;
            return user;
        });
    }
    fromApiInput(object) {
        const user = {};
        if ('id' in object)
            user.id = object.id;
        if ('email' in object)
            user.email = object.email;
        if ('password' in object)
            user.password = object.password;
        if ('is_admin' in object)
            user.is_admin = object.is_admin;
        if ('full_name' in object)
            user.full_name = object.full_name;
        if ('max_item_size' in object)
            user.max_item_size = object.max_item_size;
        if ('max_total_item_size' in object)
            user.max_total_item_size = object.max_total_item_size;
        if ('can_share_folder' in object)
            user.can_share_folder = object.can_share_folder;
        if ('can_upload' in object)
            user.can_upload = object.can_upload;
        if ('account_type' in object)
            user.account_type = object.account_type;
        if ('must_set_password' in object)
            user.must_set_password = object.must_set_password;
        return user;
    }
    objectToApiOutput(object) {
        const output = Object.assign({}, object);
        delete output.password;
        return output;
    }
    checkIfAllowed(user, action, resource = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action === BaseModel_1.AclAction.Create) {
                if (!user.is_admin)
                    throw new errors_1.ErrorForbidden('non-admin user cannot create a new user');
            }
            if (action === BaseModel_1.AclAction.Read) {
                if (user.is_admin)
                    return;
                if (user.id !== resource.id)
                    throw new errors_1.ErrorForbidden('cannot view other users');
            }
            if (action === BaseModel_1.AclAction.Update) {
                const previousResource = yield this.load(resource.id);
                if (!user.is_admin && resource.id !== user.id)
                    throw new errors_1.ErrorForbidden('non-admin user cannot modify another user');
                if (user.is_admin && user.id === resource.id && 'is_admin' in resource && !resource.is_admin)
                    throw new errors_1.ErrorForbidden('admin user cannot make themselves a non-admin');
                const canBeChangedByNonAdmin = [
                    'full_name',
                    'email',
                    'password',
                ];
                for (const key of Object.keys(resource)) {
                    if (!user.is_admin && !canBeChangedByNonAdmin.includes(key) && resource[key] !== previousResource[key]) {
                        throw new errors_1.ErrorForbidden(`non-admin user cannot change "${key}"`);
                    }
                }
            }
            if (action === BaseModel_1.AclAction.Delete) {
                if (!user.is_admin)
                    throw new errors_1.ErrorForbidden('only admins can delete users');
                if (user.id === resource.id)
                    throw new errors_1.ErrorForbidden('cannot delete own user');
            }
            if (action === BaseModel_1.AclAction.List) {
                if (!user.is_admin)
                    throw new errors_1.ErrorForbidden('non-admin cannot list users');
            }
        });
    }
    checkMaxItemSizeLimit(user, buffer, item, joplinItem) {
        return __awaiter(this, void 0, void 0, function* () {
            // If the item is encrypted, we apply a multiplier because encrypted
            // items can be much larger (seems to be up to twice the size but for
            // safety let's go with 2.2).
            const itemSize = buffer.byteLength;
            const itemTitle = joplinItem ? joplinItem.title || '' : '';
            const isNote = joplinItem && joplinItem.type_ === BaseModel_2.ModelType.Note;
            const maxItemSize = (0, user_1.getMaxItemSize)(user);
            const maxSize = maxItemSize * ((0, joplinUtils_1.itemIsEncrypted)(item) ? 2.2 : 1);
            if (itemSize > 200000000) {
                logger.info(`Trying to upload large item: ${JSON.stringify({
                    userId: user.id,
                    itemName: item.name,
                    itemSize,
                    maxItemSize,
                    maxSize,
                }, null, '    ')}`);
            }
            if (maxSize && itemSize > maxSize) {
                throw new errors_1.ErrorPayloadTooLarge((0, locale_1._)('Cannot save %s "%s" because it is larger than the allowed limit (%s)', isNote ? (0, locale_1._)('note') : (0, locale_1._)('attachment'), itemTitle ? itemTitle : item.name, (0, bytes_1.formatBytes)(maxItemSize)));
            }
            if (itemSize > this.itemSizeHardLimit)
                throw new errors_1.ErrorPayloadTooLarge(`Uploading items larger than ${prettyBytes(this.itemSizeHardLimit)} is currently disabled`);
            // We allow lock files to go through so that sync can happen, which in
            // turns allow user to fix oversized account by deleting items.
            const isWhiteListed = itemSize < 200 && item.name.startsWith('locks/');
            if (!isWhiteListed) {
                // Also apply a multiplier to take into account E2EE overhead
                const maxTotalItemSize = (0, user_1.getMaxTotalItemSize)(user) * 1.5;
                if (maxTotalItemSize && user.total_item_size + itemSize >= maxTotalItemSize) {
                    throw new errors_1.ErrorPayloadTooLarge((0, locale_1._)('Cannot save %s "%s" because it would go over the total allowed size (%s) for this account', isNote ? (0, locale_1._)('note') : (0, locale_1._)('attachment'), itemTitle ? itemTitle : item.name, (0, bytes_1.formatBytes)(maxTotalItemSize)));
                }
            }
        });
    }
    validatePassword(password) {
        if (this.env === types_2.Env.Dev)
            return;
        const result = zxcvbn(password);
        if (result.score < 3) {
            let msg = [result.feedback.warning];
            if (result.feedback.suggestions) {
                msg = msg.concat(result.feedback.suggestions);
            }
            throw new errors_1.ErrorUnprocessableEntity(msg.join(' '));
        }
    }
    validate(object, options = {}) {
        const _super = Object.create(null, {
            validate: { get: () => super.validate }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield _super.validate.call(this, object, options);
            // Note that we don't validate the password here because it's already
            // been hashed by then.
            if (options.isNew) {
                if (!user.email)
                    throw new errors_1.ErrorUnprocessableEntity('email must be set');
                if (!user.password && !user.must_set_password)
                    throw new errors_1.ErrorUnprocessableEntity('password must be set');
            }
            else {
                if ('email' in user && !user.email)
                    throw new errors_1.ErrorUnprocessableEntity('email must be set');
                if ('password' in user && !user.password)
                    throw new errors_1.ErrorUnprocessableEntity('password must be set');
            }
            if ('email' in user) {
                const existingUser = yield this.loadByEmail(user.email);
                if (existingUser && existingUser.id !== user.id)
                    throw new errors_1.ErrorUnprocessableEntity(`there is already a user with this email: ${user.email}`);
                if (!this.validateEmail(user.email))
                    throw new errors_1.ErrorUnprocessableEntity(`Invalid email: ${user.email}`);
            }
            return _super.validate.call(this, user, options);
        });
    }
    validateEmail(email) {
        const s = email.split('@');
        if (s.length !== 2)
            return false;
        return !!s[0].length && !!s[1].length;
    }
    // public async delete(id: string): Promise<void> {
    // 	const shares = await this.models().share().sharesByUser(id);
    // 	await this.withTransaction(async () => {
    // 		await this.models().item().deleteExclusivelyOwnedItems(id);
    // 		await this.models().share().delete(shares.map(s => s.id));
    // 		await this.models().userItem().deleteByUserId(id);
    // 		await this.models().session().deleteByUserId(id);
    // 		await this.models().notification().deleteByUserId(id);
    // 		await super.delete(id);
    // 	}, 'UserModel::delete');
    // }
    confirmEmail(user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.save({ id: user.id, email_confirmed: 1 });
        });
    }
    processEmailConfirmation(userId, token, beforeChangingEmailHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.models().token().checkToken(userId, token);
            const user = yield this.models().user().load(userId);
            if (!user)
                throw new errors_1.ErrorNotFound('No such user');
            const newEmail = yield this.models().keyValue().value(`newEmail::${userId}`);
            if (newEmail) {
                yield beforeChangingEmailHandler(newEmail);
                yield this.completeEmailChange(user);
            }
            else {
                yield this.confirmEmail(user);
            }
        });
    }
    initiateEmailChange(userId, newEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const beforeSaveUser = yield this.models().user().load(userId);
            yield this.models().notification().add(userId, NotificationModel_1.NotificationKey.Any, types_1.NotificationLevel.Important, 'A confirmation email has been sent to your new address. Please follow the link in that email to confirm. Your email will only be updated after that.');
            yield this.models().keyValue().setValue(`newEmail::${userId}`, newEmail);
            yield this.models().user().sendChangeEmailConfirmationEmail(newEmail, beforeSaveUser);
            yield this.models().user().sendChangeEmailNotificationEmail(beforeSaveUser.email, beforeSaveUser);
        });
    }
    completeEmailChange(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const newEmailKey = `newEmail::${user.id}`;
            const newEmail = yield this.models().keyValue().value(newEmailKey);
            const oldEmail = user.email;
            const userToSave = {
                id: user.id,
                email_confirmed: 1,
                email: newEmail,
            };
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                if (newEmail) {
                    // We keep the old email just in case. Probably yagni but it's easy enough to do.
                    yield this.models().keyValue().setValue(`oldEmail::${user.id}_${Date.now()}`, oldEmail);
                    yield this.models().keyValue().deleteValue(newEmailKey);
                }
                yield this.save(userToSave);
            }), 'UserModel::confirmEmail');
            logger.info(`Changed email of user ${user.id} from "${oldEmail}" to "${newEmail}"`);
        });
    }
    userEmailDetails(user) {
        return {
            sender_id: types_1.EmailSender.NoReply,
            recipient_id: user.id,
            recipient_email: user.email,
            recipient_name: user.full_name || '',
        };
    }
    sendAccountConfirmationEmail(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const validationToken = yield this.models().token().generate(user.id);
            const url = encodeURI((0, urlUtils_1.confirmUrl)(user.id, validationToken));
            yield this.models().email().push(Object.assign(Object.assign({}, (0, accountConfirmationTemplate_1.default)({ url })), this.userEmailDetails(user)));
        });
    }
    sendChangeEmailConfirmationEmail(recipientEmail, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const validationToken = yield this.models().token().generate(user.id);
            const url = encodeURI((0, urlUtils_1.confirmUrl)(user.id, validationToken));
            yield this.models().email().push(Object.assign(Object.assign(Object.assign({}, (0, changeEmailConfirmationTemplate_1.default)({ url })), this.userEmailDetails(user)), { recipient_email: recipientEmail }));
        });
    }
    sendChangeEmailNotificationEmail(recipientEmail, user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.models().email().push(Object.assign(Object.assign(Object.assign({}, (0, changeEmailNotificationTemplate_1.default)()), this.userEmailDetails(user)), { recipient_email: recipientEmail }));
        });
    }
    sendResetPasswordEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.loadByEmail(email);
            if (!user)
                throw new errors_1.ErrorNotFound(`No such user: ${email}`);
            const validationToken = yield this.models().token().generate(user.id);
            const url = (0, urlUtils_1.resetPasswordUrl)(validationToken);
            yield this.models().email().push(Object.assign(Object.assign({}, (0, resetPasswordTemplate_1.default)({ url })), this.userEmailDetails(user)));
        });
    }
    resetPassword(token, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, users_1.checkRepeatPassword)(fields, true);
            const user = yield this.models().token().userFromToken(token);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                yield this.models().user().save({ id: user.id, password: fields.password });
                yield this.models().session().deleteByUserId(user.id);
                yield this.models().token().deleteByValue(user.id, token);
            }), 'UserModel::resetPassword');
        });
    }
    handleBetaUserEmails() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, stripe_1.stripeConfig)().enabled)
                return;
            const range = (0, stripe_1.betaUserDateRange)();
            const betaUsers = yield this
                .db('users')
                .select(['id', 'email', 'full_name', 'account_type', 'created_time'])
                .where('created_time', '>=', range[0])
                .andWhere('created_time', '<=', range[1]);
            const reminderIntervals = [14, 3, 0];
            for (const user of betaUsers) {
                if (!(yield (0, stripe_1.isBetaUser)(this.models(), user.id)))
                    continue;
                const remainingDays = (0, stripe_1.betaUserTrialPeriodDays)(user.created_time, 0, 0);
                for (const reminderInterval of reminderIntervals) {
                    if (remainingDays <= reminderInterval) {
                        const sentKey = `betaUser::emailSent::${reminderInterval}::${user.id}`;
                        if (!(yield this.models().keyValue().value(sentKey))) {
                            yield this.models().email().push(Object.assign(Object.assign({}, (0, endOfBetaTemplate_1.default)({
                                expireDays: remainingDays,
                                startSubUrl: (0, stripe_1.betaStartSubUrl)(user.email, user.account_type),
                            })), this.userEmailDetails(user)));
                            yield this.models().keyValue().setValue(sentKey, 1);
                        }
                    }
                }
                if (remainingDays <= 0) {
                    yield this.models().userFlag().add(user.id, types_1.UserFlagType.AccountWithoutSubscription);
                }
            }
        });
    }
    handleFailedPaymentSubscriptions() {
        return __awaiter(this, void 0, void 0, function* () {
            const subInfos = [
                {
                    subs: yield this.models().subscription().failedPaymentWarningSubscriptions(),
                    emailKeyPrefix: 'payment_failed_upload_disabled_',
                    flagType: types_1.UserFlagType.FailedPaymentWarning,
                    templateFn: () => (0, paymentFailedUploadDisabledTemplate_1.default)({ disabledInDays: Math.round(SubscriptionModel_1.failedPaymentFinalAccount / time_1.Day) }),
                },
                {
                    subs: yield this.models().subscription().failedPaymentFinalSubscriptions(),
                    emailKeyPrefix: 'payment_failed_account_disabled_',
                    flagType: types_1.UserFlagType.FailedPaymentFinal,
                    templateFn: () => (0, paymentFailedAccountDisabledTemplate_1.default)(),
                },
            ];
            let users = [];
            for (const subInfo of subInfos) {
                users = users.concat(yield this.loadByIds(subInfo.subs.map(s => s.user_id)));
            }
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const subInfo of subInfos) {
                    for (const sub of subInfo.subs) {
                        const user = users.find(u => u.id === sub.user_id);
                        if (!user) {
                            logger.error(`Could not find user for subscription ${sub.id}`);
                            continue;
                        }
                        const existingFlag = yield this.models().userFlag().byUserId(user.id, subInfo.flagType);
                        if (!existingFlag) {
                            yield this.models().userFlag().add(user.id, subInfo.flagType);
                            yield this.models().email().push(Object.assign(Object.assign(Object.assign({}, subInfo.templateFn()), this.userEmailDetails(user)), { key: `${subInfo.emailKeyPrefix}${sub.last_payment_failed_time}` }));
                        }
                    }
                }
            }), 'UserModel::handleFailedPaymentSubscriptions');
        });
    }
    handleOversizedAccounts() {
        return __awaiter(this, void 0, void 0, function* () {
            const alertLimit1 = 0.8;
            const alertLimitMax = 1;
            const basicAccount = accountByType(AccountType.Basic);
            const proAccount = accountByType(AccountType.Pro);
            const basicDefaultLimit1 = Math.round(alertLimit1 * basicAccount.max_total_item_size);
            const proDefaultLimit1 = Math.round(alertLimit1 * proAccount.max_total_item_size);
            const basicDefaultLimitMax = Math.round(alertLimitMax * basicAccount.max_total_item_size);
            const proDefaultLimitMax = Math.round(alertLimitMax * proAccount.max_total_item_size);
            // ------------------------------------------------------------------------
            // First, find all the accounts that are over the limit and send an
            // email to the owner. Also flag accounts that are over 100% full.
            // ------------------------------------------------------------------------
            const users = yield this
                .db(this.tableName)
                .select(['id', 'total_item_size', 'max_total_item_size', 'account_type', 'email', 'full_name'])
                .where(function () {
                void this.whereRaw('total_item_size > ? AND account_type = ?', [basicDefaultLimit1, AccountType.Basic])
                    .orWhereRaw('total_item_size > ? AND account_type = ?', [proDefaultLimit1, AccountType.Pro]);
            })
                // Users who are disabled or who cannot upload already received the
                // notification.
                .andWhere('enabled', '=', 1)
                .andWhere('can_upload', '=', 1);
            const makeEmailKey = (user, alertLimit) => {
                return [
                    'oversizedAccount',
                    user.account_type,
                    alertLimit * 100,
                    // Also add the month/date to the key so that we don't send more than one email a month
                    dayjs(Date.now()).format('MMYY'),
                ].join('::');
            };
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const user of users) {
                    const maxTotalItemSize = (0, user_1.getMaxTotalItemSize)(user);
                    const account = accountByType(user.account_type);
                    if (user.total_item_size > maxTotalItemSize * alertLimitMax) {
                        yield this.models().email().push(Object.assign(Object.assign(Object.assign({}, (0, oversizedAccount2_1.default)({
                            percentLimit: alertLimitMax * 100,
                            url: this.baseUrl,
                        })), this.userEmailDetails(user)), { sender_id: types_1.EmailSender.Support, key: makeEmailKey(user, alertLimitMax) }));
                        yield this.models().userFlag().add(user.id, types_1.UserFlagType.AccountOverLimit);
                    }
                    else if (maxTotalItemSize > account.max_total_item_size * alertLimit1) {
                        yield this.models().email().push(Object.assign(Object.assign(Object.assign({}, (0, oversizedAccount1_1.default)({
                            percentLimit: alertLimit1 * 100,
                            url: this.baseUrl,
                        })), this.userEmailDetails(user)), { sender_id: types_1.EmailSender.Support, key: makeEmailKey(user, alertLimit1) }));
                    }
                }
            }), 'UserModel::handleOversizedAccounts::1');
            // ------------------------------------------------------------------------
            // Secondly, find all the accounts that have previously been flagged and
            // that are now under the limit. Remove the flag from these accounts.
            // ------------------------------------------------------------------------
            const flaggedUsers = yield this
                .db({ f: 'user_flags' })
                .select(['u.id', 'u.total_item_size', 'u.max_total_item_size', 'u.account_type', 'u.email', 'u.full_name'])
                .join({ u: 'users' }, 'u.id', 'f.user_id')
                .where('f.type', '=', types_1.UserFlagType.AccountOverLimit)
                .where(function () {
                void this
                    .whereRaw('u.total_item_size < ? AND u.account_type = ?', [basicDefaultLimitMax, AccountType.Basic])
                    .orWhereRaw('u.total_item_size < ? AND u.account_type = ?', [proDefaultLimitMax, AccountType.Pro]);
            });
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const user of flaggedUsers) {
                    const maxTotalItemSize = (0, user_1.getMaxTotalItemSize)(user);
                    if (user.total_item_size < maxTotalItemSize) {
                        yield this.models().userFlag().remove(user.id, types_1.UserFlagType.AccountOverLimit);
                    }
                }
            }), 'UserModel::handleOversizedAccounts::2');
        });
    }
    formatValues(user) {
        const output = Object.assign({}, user);
        if ('email' in output)
            output.email = (`${user.email}`).trim().toLowerCase();
        return output;
    }
    syncInfo(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.models().item().loadByName(userId, 'info.json');
            // We can get there if user 1 tries to share a notebook with user 2, but
            // user 2 has never initiated a sync. In this case, they won't have the
            // info.json file that we need, so we try to return an error message
            // that makes sense.
            if (!item)
                throw new errors_1.ErrorBadRequest('The account of this user is not correctly initialised (missing info.json)');
            const withContent = yield this.models().item().loadWithContent(item.id);
            return JSON.parse(withContent.content.toString());
        });
    }
    publicPrivateKey(userId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const syncInfo = yield this.syncInfo(userId);
            return ((_a = syncInfo.ppk) === null || _a === void 0 ? void 0 : _a.value) || null;
        });
    }
    // Note that when the "password" property is provided, it is going to be
    // hashed automatically. It means that it is not safe to do:
    //
    //     const user = await model.load(id);
    //     await model.save(user);
    //
    // Because the password would be hashed twice.
    save(object, options = {}) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.formatValues(object);
            if (user.password) {
                if (!options.skipValidation)
                    this.validatePassword(user.password);
                user.password = auth.hashPassword(user.password);
            }
            const isNew = yield this.isNew(object, options);
            return this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                const savedUser = yield _super.save.call(this, user, options);
                if (isNew) {
                    yield this.sendAccountConfirmationEmail(savedUser);
                }
                if (isNew)
                    UserModel.eventEmitter.emit('created');
                return savedUser;
            }), 'UserModel::save');
        });
    }
    saveMulti(users, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const user of users) {
                    yield this.save(user, options);
                }
            }), 'UserModel::saveMulti');
        });
    }
}
exports.default = UserModel;
//# sourceMappingURL=UserModel.js.map