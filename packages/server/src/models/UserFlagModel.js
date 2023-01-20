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
exports.userFlagToString = void 0;
const Logger_1 = require("@joplin/lib/Logger");
const db_1 = require("../db");
const types_1 = require("../services/database/types");
const time_1 = require("../utils/time");
const BaseModel_1 = require("./BaseModel");
const logger = Logger_1.default.create('UserFlagModel');
function defaultAddRemoveOptions() {
    return {
        updateUser: true,
    };
}
function userFlagToString(flag) {
    return `${(0, types_1.userFlagTypeToLabel)(flag.type)} on ${(0, time_1.formatDateTime)(flag.created_time)}`;
}
exports.userFlagToString = userFlagToString;
class UserFlagModels extends BaseModel_1.default {
    get tableName() {
        return 'user_flags';
    }
    hasUuid() {
        return false;
    }
    add(userId, type, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign(Object.assign({}, defaultAddRemoveOptions()), options);
            try {
                yield this.save({
                    user_id: userId,
                    type,
                }, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
            }
            catch (error) {
                if (!(0, db_1.isUniqueConstraintError)(error)) {
                    throw error;
                }
            }
            if (options.updateUser)
                yield this.updateUserFromFlags(userId);
        });
    }
    remove(userId, type, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign(Object.assign({}, defaultAddRemoveOptions()), options);
            yield this.db(this.tableName)
                .where('user_id', '=', userId)
                .where('type', '=', type)
                .delete();
            if (options.updateUser)
                yield this.updateUserFromFlags(userId);
        });
    }
    toggle(userId, type, apply, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (apply) {
                yield this.add(userId, type, options);
            }
            else {
                yield this.remove(userId, type, options);
            }
        });
    }
    addMulti(userId, flagTypes) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const flagType of flagTypes) {
                    yield this.add(userId, flagType, { updateUser: false });
                }
                yield this.updateUserFromFlags(userId);
            }), 'UserFlagModels::addMulti');
        });
    }
    removeMulti(userId, flagTypes) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!flagTypes.length)
                return;
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const flagType of flagTypes) {
                    yield this.remove(userId, flagType, { updateUser: false });
                }
                yield this.updateUserFromFlags(userId);
            }), 'UserFlagModels::removeMulti');
        });
    }
    // As a general rule the `enabled` and  `can_upload` properties should not
    // be set directly (except maybe in tests) - instead the appropriate user
    // flags should be set, and this function will derive the enabled/can_upload
    // properties from them.
    updateUserFromFlags(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const flags = yield this.allByUserId(userId);
            const user = yield this.models().user().load(userId, { fields: ['id', 'can_upload', 'enabled'] });
            const newProps = {
                can_upload: 1,
                enabled: 1,
            };
            const accountWithoutSubscriptionFlag = flags.find(f => f.type === types_1.UserFlagType.AccountWithoutSubscription);
            const accountOverLimitFlag = flags.find(f => f.type === types_1.UserFlagType.AccountOverLimit);
            const failedPaymentWarningFlag = flags.find(f => f.type === types_1.UserFlagType.FailedPaymentWarning);
            const failedPaymentFinalFlag = flags.find(f => f.type === types_1.UserFlagType.FailedPaymentFinal);
            const subscriptionCancelledFlag = flags.find(f => f.type === types_1.UserFlagType.SubscriptionCancelled);
            const manuallyDisabledFlag = flags.find(f => f.type === types_1.UserFlagType.ManuallyDisabled);
            const userDeletionInProgress = flags.find(f => f.type === types_1.UserFlagType.UserDeletionInProgress);
            if (accountWithoutSubscriptionFlag) {
                newProps.can_upload = 0;
            }
            if (accountOverLimitFlag) {
                newProps.can_upload = 0;
            }
            if (failedPaymentWarningFlag) {
                newProps.can_upload = 0;
            }
            if (failedPaymentFinalFlag) {
                newProps.enabled = 0;
            }
            if (subscriptionCancelledFlag) {
                newProps.enabled = 0;
            }
            if (manuallyDisabledFlag) {
                newProps.enabled = 0;
            }
            if (userDeletionInProgress) {
                newProps.enabled = 0;
            }
            let removeFromDeletionQueue = false;
            if (!user.enabled && newProps.enabled) {
                if (yield this.models().userDeletion().isDeletedOrBeingDeleted(userId)) {
                    // User account is being deleted or already deleted and cannot
                    // be enabled again.
                    logger.error('Trying to enable an account that is queued for deletion - leaving account disabled');
                    newProps.enabled = 0;
                }
                else {
                    // If the user has been re-enabled, we want to remove it from
                    // the deletion queue (if it has been queued there) immediately,
                    // so that it doesn't incorrectly get deleted.
                    removeFromDeletionQueue = true;
                }
            }
            if (user.enabled !== newProps.enabled) {
                newProps.disabled_time = !newProps.enabled ? Date.now() : 0;
            }
            if (user.can_upload !== newProps.can_upload || user.enabled !== newProps.enabled) {
                yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                    if (removeFromDeletionQueue)
                        yield this.models().userDeletion().removeFromQueueByUserId(userId);
                    yield this.models().user().save(Object.assign({ id: userId }, newProps));
                }), 'UserFlagModel::updateUserFromFlags');
            }
        });
    }
    byUserId(userId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName)
                .where('user_id', '=', userId)
                .where('type', '=', type)
                .first();
        });
    }
    allByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).where('user_id', '=', userId);
        });
    }
    deleteByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).where('user_id', '=', userId).delete();
        });
    }
}
exports.default = UserFlagModels;
//# sourceMappingURL=UserFlagModel.js.map