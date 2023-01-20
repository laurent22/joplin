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
exports.NotificationKey = void 0;
const types_1 = require("../services/database/types");
const errors_1 = require("../utils/errors");
const uuidgen_1 = require("../utils/uuidgen");
const BaseModel_1 = require("./BaseModel");
var NotificationKey;
(function (NotificationKey) {
    NotificationKey["Any"] = "any";
    // ConfirmEmail = 'confirmEmail',
    NotificationKey["PasswordSet"] = "passwordSet";
    NotificationKey["EmailConfirmed"] = "emailConfirmed";
    NotificationKey["ChangeAdminPassword"] = "change_admin_password";
    // UsingSqliteInProd = 'using_sqlite_in_prod',
    NotificationKey["UpgradedToPro"] = "upgraded_to_pro";
})(NotificationKey = exports.NotificationKey || (exports.NotificationKey = {}));
class NotificationModel extends BaseModel_1.default {
    get tableName() {
        return 'notifications';
    }
    validate(notification, options = {}) {
        const _super = Object.create(null, {
            validate: { get: () => super.validate }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if ('owner_id' in notification && !notification.owner_id)
                throw new errors_1.ErrorUnprocessableEntity('Missing owner_id');
            return _super.validate.call(this, notification, options);
        });
    }
    add(userId, key, level = null, message = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const notificationTypes = {
                // [NotificationKey.ConfirmEmail]: {
                // 	level: NotificationLevel.Normal,
                // 	message: `Welcome to ${this.appName}! An email has been sent to you containing an activation link to complete your registration. Make sure you click it to secure your account and keep access to it.`,
                // },
                [NotificationKey.EmailConfirmed]: {
                    level: types_1.NotificationLevel.Normal,
                    message: 'Your email has been confirmed',
                },
                [NotificationKey.PasswordSet]: {
                    level: types_1.NotificationLevel.Normal,
                    message: `Welcome to ${this.appName}! Your password has been set successfully.`,
                },
                // [NotificationKey.UsingSqliteInProd]: {
                // 	level: NotificationLevel.Important,
                // 	message: 'The server is currently using SQLite3 as a database. It is not recommended in production as it is slow and can cause locking issues. Please see the README for information on how to change it.',
                // },
                [NotificationKey.UpgradedToPro]: {
                    level: types_1.NotificationLevel.Normal,
                    message: 'Thank you! Your account has been successfully upgraded to Pro.',
                },
                [NotificationKey.Any]: {
                    level: types_1.NotificationLevel.Normal,
                    message: '',
                },
            };
            const n = yield this.loadByKey(userId, key);
            if (n) {
                if (!n.read)
                    return n;
                yield this.save({ id: n.id, read: 0 });
                return Object.assign(Object.assign({}, n), { read: 0 });
            }
            const type = notificationTypes[key];
            if (level === null) {
                if (type === null || type === void 0 ? void 0 : type.level) {
                    level = type.level;
                }
                else {
                    throw new Error('Missing notification level');
                }
            }
            if (message === null) {
                if (type === null || type === void 0 ? void 0 : type.message) {
                    message = type.message;
                }
                else {
                    throw new Error('Missing notification message');
                }
            }
            const actualKey = key === NotificationKey.Any ? `any_${(0, uuidgen_1.default)()}` : key;
            return this.save({ key: actualKey, message, level, owner_id: userId });
        });
    }
    addInfo(userId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.add(userId, NotificationKey.Any, types_1.NotificationLevel.Normal, message);
        });
    }
    addError(userId, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = typeof error === 'string' ? error : error.message;
            return this.add(userId, NotificationKey.Any, types_1.NotificationLevel.Error, message);
        });
    }
    setRead(userId, key, read = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const n = yield this.loadByKey(userId, key);
            if (!n)
                return;
            yield this.db(this.tableName)
                .update({ read: read ? 1 : 0 })
                .where('key', '=', key)
                .andWhere('owner_id', '=', userId);
        });
    }
    loadByKey(userId, key) {
        return this.db(this.tableName)
            .select(this.defaultFields)
            .where('key', '=', key)
            .andWhere('owner_id', '=', userId)
            .first();
    }
    loadUnreadByKey(userId, key) {
        return this.db(this.tableName)
            .select(this.defaultFields)
            .where('key', '=', key)
            .andWhere('read', '=', 0)
            .andWhere('owner_id', '=', userId)
            .first();
    }
    allUnreadByUserId(userId) {
        return this.db(this.tableName)
            .select(this.defaultFields)
            .where('owner_id', '=', userId)
            .andWhere('read', '=', 0)
            .orderBy('updated_time', 'asc');
    }
    closeUrl(id) {
        return `${this.baseUrl}/notifications/${id}`;
    }
    load(id) {
        return this.db(this.tableName)
            .select(this.defaultFields)
            .where({ id: id })
            .first();
    }
    deleteByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).where('owner_id', '=', userId).delete();
        });
    }
}
exports.default = NotificationModel;
//# sourceMappingURL=NotificationModel.js.map