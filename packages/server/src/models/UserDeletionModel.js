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
const errors_1 = require("../utils/errors");
const BaseModel_1 = require("./BaseModel");
const defaultAddOptions = () => {
    const d = {
        processAccount: true,
        processData: true,
    };
    return d;
};
class UserDeletionModel extends BaseModel_1.default {
    get tableName() {
        return 'user_deletions';
    }
    hasUuid() {
        return false;
    }
    byUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).where('user_id', '=', userId).first();
        });
    }
    isScheduledForDeletion(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.db(this.tableName).select(['id']).where('user_id', '=', userId).first();
            return !!r;
        });
    }
    isDeletedOrBeingDeleted(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.db(this.tableName).select(['id', 'start_time']).where('user_id', '=', userId).first();
            return !!r && !!r.start_time;
        });
    }
    add(userId, scheduledTime, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign(Object.assign({}, defaultAddOptions()), options);
            const now = Date.now();
            const o = {
                user_id: userId,
                scheduled_time: scheduledTime,
                created_time: now,
                updated_time: now,
                process_account: options.processAccount ? 1 : 0,
                process_data: options.processData ? 1 : 0,
            };
            yield this.db(this.tableName).insert(o);
            return this.byUserId(userId);
        });
    }
    remove(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).where('id', '=', jobId).delete();
        });
    }
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .where('scheduled_time', '<=', Date.now())
                .andWhere('start_time', '=', 0)
                .orderBy('scheduled_time', 'asc')
                .first();
        });
    }
    start(deletionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            yield this
                .db(this.tableName)
                .update({ start_time: now, updated_time: now })
                .where('id', deletionId)
                .andWhere('start_time', '=', 0);
            const item = yield this.load(deletionId);
            if (item.start_time !== now)
                throw new Error('Job was already started');
        });
    }
    end(deletionId, success, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            const o = {
                end_time: now,
                updated_time: now,
                success: success ? 1 : 0,
                error: error ? (0, errors_1.errorToString)(error) : '',
            };
            yield this
                .db(this.tableName)
                .update(o)
                .where('id', deletionId);
        });
    }
    autoAdd(maxAutoAddedAccounts, ttl, scheduledTime, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const cutOffTime = Date.now() - ttl;
            const disabledUsers = yield this.db('users')
                .select(['users.id'])
                .leftJoin('user_deletions', 'users.id', 'user_deletions.user_id')
                .where('users.enabled', '=', 0)
                .where('users.disabled_time', '<', cutOffTime)
                .whereNull('user_deletions.user_id') // Only add users not already in the user_deletions table
                .limit(maxAutoAddedAccounts);
            const userIds = disabledUsers.map(d => d.id);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const userId of userIds) {
                    yield this.add(userId, scheduledTime, options);
                }
            }), 'UserDeletionModel::autoAdd');
            return userIds;
        });
    }
    // Remove a user from the deletion queue, before it gets deleted. If it has
    // already been deleted or if it's being deleted, no action is performed.
    removeFromQueueByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).where('user_id', '=', userId).andWhere('start_time', '=', 0).delete();
        });
    }
}
exports.default = UserDeletionModel;
//# sourceMappingURL=UserDeletionModel.js.map