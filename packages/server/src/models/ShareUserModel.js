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
const types_1 = require("../services/database/types");
const errors_1 = require("../utils/errors");
const BaseModel_1 = require("./BaseModel");
const user_1 = require("./utils/user");
class ShareUserModel extends BaseModel_1.default {
    get tableName() {
        return 'share_users';
    }
    checkIfAllowed(user, action, resource = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action === BaseModel_1.AclAction.Create) {
                const recipient = yield this.models().user().load(resource.user_id, { fields: ['account_type', 'can_share_folder', 'enabled'] });
                if (!recipient.enabled)
                    throw new errors_1.ErrorForbidden('the recipient account is disabled');
                if (!(0, user_1.getCanShareFolder)(recipient))
                    throw new errors_1.ErrorForbidden('The sharing feature is not enabled for the recipient account');
                const share = yield this.models().share().load(resource.share_id);
                if (share.owner_id !== user.id)
                    throw new errors_1.ErrorForbidden('no access to the share object');
                if (share.owner_id === resource.user_id)
                    throw new errors_1.ErrorForbidden('cannot share an item with yourself');
                const existingShareUser = yield this.byShareAndUserId(share.id, resource.user_id);
                if (existingShareUser)
                    throw new errors_1.ErrorForbidden('already shared with this user');
            }
            if (action === BaseModel_1.AclAction.Update) {
                if (user.id !== resource.user_id)
                    throw new errors_1.ErrorForbidden('cannot change share user');
            }
            if (action === BaseModel_1.AclAction.Delete) {
                const share = yield this.models().share().load(resource.share_id);
                // Recipient can accept or reject a share, but only the owner can
                // actually delete the invitation.
                if (share.owner_id !== user.id)
                    throw new errors_1.ErrorForbidden('only the owner of a share can add or remove recipients');
            }
        });
    }
    byUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).select(this.defaultFields).where('user_id', '=', userId);
        });
    }
    byShareId(shareId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.byShareIds([shareId], status);
            return Object.keys(r).length > 0 ? r[shareId] : [];
        });
    }
    byShareIds(shareIds, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this
                .db(this.tableName)
                .select(this.defaultFields)
                .whereIn('share_id', shareIds);
            if (status !== null)
                void query.where('status', status);
            const rows = yield query;
            const output = {};
            for (const row of rows) {
                if (!(row.share_id in output))
                    output[row.share_id] = [];
                output[row.share_id].push(row);
            }
            return output;
        });
    }
    isShareParticipant(shareId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.byShareAndUserId(shareId, userId);
            if (r)
                return true;
            const share = yield this.models().share().load(shareId, { fields: ['owner_id'] });
            return share && share.owner_id === userId;
        });
    }
    byShareAndUserId(shareId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const link = {
                share_id: shareId,
                user_id: userId,
            };
            return this.db(this.tableName).where(link).first();
        });
    }
    shareWithUserAndAccept(share, shareeId, masterKey = '') {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.models().shareUser().addById(share.id, shareeId, masterKey);
            yield this.models().shareUser().setStatus(share.id, shareeId, types_1.ShareUserStatus.Accepted);
        });
    }
    addById(shareId, userId, masterKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.models().user().load(userId);
            return this.addByEmail(shareId, user.email, masterKey);
        });
    }
    byShareAndEmail(shareId, userEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.models().user().loadByEmail(userEmail);
            if (!user)
                throw new errors_1.ErrorNotFound(`No such user: ${userEmail}`);
            return this.db(this.tableName).select(this.defaultFields)
                .where('share_id', '=', shareId)
                .where('user_id', '=', user.id)
                .first();
        });
    }
    addByEmail(shareId, userEmail, masterKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const share = yield this.models().share().load(shareId);
            if (!share)
                throw new errors_1.ErrorNotFound(`No such share: ${shareId}`);
            const user = yield this.models().user().loadByEmail(userEmail);
            if (!user)
                throw new errors_1.ErrorNotFound(`No such user: ${userEmail}`);
            return this.save({
                share_id: shareId,
                user_id: user.id,
                master_key: masterKey,
            });
        });
    }
    setStatus(shareId, userId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const shareUser = yield this.byShareAndUserId(shareId, userId);
            if (!shareUser)
                throw new errors_1.ErrorNotFound(`Item has not been shared with this user: ${shareId} / ${userId}`);
            if (shareUser.status === status)
                throw new errors_1.ErrorBadRequest(`Share ${shareId} status is already ${status}`);
            const share = yield this.models().share().load(shareId);
            if (!share)
                throw new errors_1.ErrorNotFound(`No such share: ${shareId}`);
            return this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                if (status === types_1.ShareUserStatus.Accepted) {
                    yield this.models().share().createSharedFolderUserItems(shareId, userId);
                }
                return this.save(Object.assign(Object.assign({}, shareUser), { status }));
            }), 'ShareUserModel::setStatus');
        });
    }
    deleteByShare(share) {
        return __awaiter(this, void 0, void 0, function* () {
            // Notes that are shared by link do not have associated ShareUser items,
            // so there's nothing to do.
            if (share.type !== types_1.ShareType.Folder)
                return;
            const shareUsers = yield this.byShareId(share.id, null);
            if (!shareUsers.length)
                return;
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                yield this.delete(shareUsers.map(s => s.id));
            }), 'ShareUserModel::deleteByShare');
        });
    }
    deleteByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const shareUsers = yield this.byUserId(userId);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const shareUser of shareUsers) {
                    yield this.delete(shareUser.id);
                }
            }), 'UserShareModel::deleteByUserId');
        });
    }
    delete(id, _options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = typeof id === 'string' ? [id] : id;
            if (!ids.length)
                throw new Error('no id provided');
            const shareUsers = yield this.loadByIds(ids, { fields: ['user_id', 'share_id'] });
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const shareUser of shareUsers) {
                    yield this.models().userItem().deleteByShareAndUserId(shareUser.share_id, shareUser.user_id);
                }
                yield this.db(this.tableName).whereIn('id', ids).delete();
            }), 'ShareUserModel::delete');
        });
    }
}
exports.default = ShareUserModel;
//# sourceMappingURL=ShareUserModel.js.map