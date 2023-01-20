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
const Logger_1 = require("@joplin/lib/Logger");
const time_1 = require("../utils/time");
const BaseService_1 = require("./BaseService");
const types_1 = require("./database/types");
const logger = Logger_1.default.create('UserDeletionService');
class UserDeletionService extends BaseService_1.default {
    constructor() {
        super(...arguments);
        this.name_ = 'UserDeletionService';
    }
    deleteUserData(userId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // While the "UserDeletionInProgress" flag is on, the account is
            // disabled so that no new items or other changes can happen.
            yield this.models.userFlag().add(userId, types_1.UserFlagType.UserDeletionInProgress);
            try {
                // ---------------------------------------------------------------------
                // Delete own shares and shares participated in. Note that when the
                // shares are deleted, the associated user_items are deleted too, so we
                // don't need to wait for ShareService to run to continue.
                // ---------------------------------------------------------------------
                logger.info(`Deleting shares for user ${userId}`);
                yield this.models.share().deleteByUserId(userId);
                yield this.models.shareUser().deleteByUserId(userId);
                // ---------------------------------------------------------------------
                // Delete items. Also delete associated change objects.
                // ---------------------------------------------------------------------
                logger.info(`Deleting items for user ${userId}`);
                while (true) {
                    const pagination = {
                        limit: 1000,
                    };
                    const page = yield this.models.item().children(userId, '', pagination, { fields: ['id'] });
                    if (!page.items.length)
                        break;
                    yield this.models.item().delete(page.items.map(it => it.id), {
                        deleteChanges: true,
                    });
                    yield (0, time_1.msleep)(options.sleepBetweenOperations);
                }
            }
            finally {
                yield this.models.userFlag().remove(userId, types_1.UserFlagType.UserDeletionInProgress);
            }
        });
    }
    deleteUserAccount(userId, _options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`Deleting user account: ${userId}`);
            const user = yield this.models.user().load(userId);
            if (!user)
                throw new Error(`No such user: ${userId}`);
            const flags = yield this.models.userFlag().allByUserId(userId);
            yield this.models.backupItem().add(types_1.BackupItemType.UserAccount, user.email, JSON.stringify({
                user,
                flags,
            }), userId);
            yield this.models.userFlag().add(userId, types_1.UserFlagType.UserDeletionInProgress);
            yield this.models.session().deleteByUserId(userId);
            yield this.models.notification().deleteByUserId(userId);
            yield this.models.user().delete(userId);
            yield this.models.userFlag().deleteByUserId(userId);
        });
    }
    processDeletionJob(deletion, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ sleepBetweenOperations: 5000 }, options);
            logger.info('Starting user deletion: ', deletion);
            // Normally, a user that is still enabled should not be processed here,
            // because it should not have been queued to begin with (or if it was
            // queued, then enabled, it should have been removed from the queue).
            // But as a fail safe we have this extra check.
            //
            // We also remove the job from the queue so that the service doesn't try
            // to process it again.
            const user = yield this.models.user().load(deletion.user_id);
            if (user.enabled) {
                logger.error(`Trying to delete a user that is still enabled - aborting and removing the user from the queue. Deletion job: ${JSON.stringify(deletion)}`);
                yield this.models.userDeletion().removeFromQueueByUserId(user.id);
                return;
            }
            let error = null;
            let success = true;
            try {
                yield this.models.userDeletion().start(deletion.id);
                if (deletion.process_data)
                    yield this.deleteUserData(deletion.user_id, options);
                if (deletion.process_account)
                    yield this.deleteUserAccount(deletion.user_id, options);
            }
            catch (e) {
                error = e;
                success = false;
                logger.error(`Processing deletion ${deletion.id}:`, error);
            }
            yield this.models.userDeletion().end(deletion.id, success, error);
            logger.info('Completed user deletion: ', deletion.id);
        });
    }
    autoAddForDeletion() {
        return __awaiter(this, void 0, void 0, function* () {
            const addedUserIds = yield this.models.userDeletion().autoAdd(10, this.config.USER_DATA_AUTO_DELETE_AFTER_DAYS * time_1.Day, Date.now() + 3 * time_1.Day, {
                processAccount: true,
                processData: true,
            });
            if (addedUserIds.length) {
                logger.info(`autoAddForDeletion: Queued ${addedUserIds.length} users for deletions: ${addedUserIds.join(', ')}`);
            }
            else {
                logger.info('autoAddForDeletion: No users were queued for deletion');
            }
        });
    }
    processNextDeletionJob() {
        return __awaiter(this, void 0, void 0, function* () {
            const deletion = yield this.models.userDeletion().next();
            if (!deletion)
                return;
            yield this.processDeletionJob(deletion);
        });
    }
    maintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processNextDeletionJob();
        });
    }
}
exports.default = UserDeletionService;
//# sourceMappingURL=UserDeletionService.js.map