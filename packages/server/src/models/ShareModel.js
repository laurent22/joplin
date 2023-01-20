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
const BaseModel_1 = require("@joplin/lib/BaseModel");
const joplinUtils_1 = require("../utils/joplinUtils");
const types_1 = require("../services/database/types");
const array_1 = require("../utils/array");
const errors_1 = require("../utils/errors");
const urlUtils_1 = require("../utils/urlUtils");
const BaseModel_2 = require("./BaseModel");
const routeUtils_1 = require("../utils/routeUtils");
const user_1 = require("./utils/user");
const db_1 = require("../db");
const Logger_1 = require("@joplin/lib/Logger");
const logger = Logger_1.default.create('ShareModel');
class ShareModel extends BaseModel_2.default {
    get tableName() {
        return 'shares';
    }
    checkIfAllowed(user, action, resource = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action === BaseModel_2.AclAction.Create) {
                if (resource.type === types_1.ShareType.Folder && !(0, user_1.getCanShareFolder)(user))
                    throw new errors_1.ErrorForbidden('The sharing feature is not enabled for this account');
                // Note that currently all users can always share notes by URL so
                // there's no check on the permission
                if (!(yield this.models().item().userHasItem(user.id, resource.item_id)))
                    throw new errors_1.ErrorForbidden('cannot share an item not owned by the user');
                if (resource.type === types_1.ShareType.Folder) {
                    const item = yield this.models().item().loadByJopId(user.id, resource.folder_id);
                    if (item.jop_parent_id)
                        throw new errors_1.ErrorForbidden('A shared notebook must be at the root');
                }
            }
            if (action === BaseModel_2.AclAction.Read) {
                if (user.id !== resource.owner_id)
                    throw new errors_1.ErrorForbidden('no access to this share');
            }
            if (action === BaseModel_2.AclAction.Delete) {
                if (user.id !== resource.owner_id)
                    throw new errors_1.ErrorForbidden('no access to this share');
            }
        });
    }
    checkShareUrl(share, shareUrl) {
        if (this.baseUrl === this.userContentBaseUrl)
            return; // OK
        const userId = (0, routeUtils_1.userIdFromUserContentUrl)(shareUrl);
        const shareUserId = share.owner_id.toLowerCase();
        if (userId.length >= 10 && shareUserId.indexOf(userId) === 0) {
            // OK
        }
        else {
            throw new errors_1.ErrorBadRequest('Invalid origin (User Content)');
        }
    }
    objectToApiOutput(object) {
        const output = {};
        if (object.id)
            output.id = object.id;
        if (object.type)
            output.type = object.type;
        if (object.folder_id)
            output.folder_id = object.folder_id;
        if (object.owner_id)
            output.owner_id = object.owner_id;
        if (object.note_id)
            output.note_id = object.note_id;
        if (object.master_key_id)
            output.master_key_id = object.master_key_id;
        return output;
    }
    validate(share, options = {}) {
        const _super = Object.create(null, {
            validate: { get: () => super.validate }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if ('type' in share && ![types_1.ShareType.Note, types_1.ShareType.Folder].includes(share.type))
                throw new errors_1.ErrorBadRequest(`Invalid share type: ${share.type}`);
            if (share.type !== types_1.ShareType.Note && (yield this.itemIsShared(share.type, share.item_id)))
                throw new errors_1.ErrorBadRequest('A shared item cannot be shared again');
            const item = yield this.models().item().load(share.item_id);
            if (!item)
                throw new errors_1.ErrorNotFound(`Could not find item: ${share.item_id}`);
            return _super.validate.call(this, share, options);
        });
    }
    createShare(userId, shareType, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const toSave = {
                type: shareType,
                item_id: itemId,
                owner_id: userId,
            };
            return this.save(toSave);
        });
    }
    itemShare(shareType, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .select(this.defaultFields)
                .where('item_id', '=', itemId)
                .where('type', '=', shareType)
                .first();
        });
    }
    itemIsShared(shareType, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.itemShare(shareType, itemId);
            return !!r;
        });
    }
    shareUrl(shareOwnerId, id, query = null) {
        return (0, urlUtils_1.setQueryParameters)(`${this.personalizedUserContentBaseUrl(shareOwnerId)}/shares/${id}`, query);
    }
    byItemId(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.byItemIds([itemId]);
            return r.length ? r[0] : null;
        });
    }
    byItemIds(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
        });
    }
    byItemAndRecursive(itemId, recursive) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName)
                .select(this.defaultFields)
                .where('item_id', itemId)
                .where('recursive', recursive ? 1 : 0)
                .first();
        });
    }
    byUserId(userId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const query1 = this
                .db(this.tableName)
                .select(this.defaultFields)
                .where('type', '=', type)
                .whereIn('id', this
                .db('share_users')
                .select('share_id')
                .where('user_id', '=', userId));
            const query2 = this
                .db(this.tableName)
                .select(this.defaultFields)
                .where('type', '=', type)
                .where('owner_id', '=', userId);
            return query1.union(query2);
        });
    }
    byUserAndItemId(userId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).select(this.defaultFields)
                .where('owner_id', '=', userId)
                .where('item_id', '=', itemId)
                .first();
        });
    }
    sharesByUser(userId, type = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.db(this.tableName)
                .select(this.defaultFields)
                .where('owner_id', '=', userId);
            if (type)
                void query.andWhere('type', '=', type);
            return query;
        });
    }
    participatedSharesByUser(userId, type = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.db(this.tableName)
                .select(this.defaultFields)
                .whereIn('id', this.db('share_users')
                .select('share_id')
                .where('user_id', '=', userId)
                .andWhere('status', '=', types_1.ShareUserStatus.Accepted));
            if (type)
                void query.andWhere('type', '=', type);
            return query;
        });
    }
    // Returns all user IDs concerned by the share. That includes all the users
    // the folder has been shared with, as well as the folder owner.
    allShareUserIds(share) {
        return __awaiter(this, void 0, void 0, function* () {
            const shareUsers = yield this.models().shareUser().byShareId(share.id, types_1.ShareUserStatus.Accepted);
            const userIds = shareUsers.map(su => su.user_id);
            userIds.push(share.owner_id);
            return userIds;
        });
    }
    updateSharedItems3() {
        return __awaiter(this, void 0, void 0, function* () {
            const addUserItem = (shareUserId, itemId) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.models().userItem().add(shareUserId, itemId, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
                }
                catch (error) {
                    if (!(0, db_1.isUniqueConstraintError)(error))
                        throw error;
                }
            });
            const removeUserItem = (shareUserId, itemId) => __awaiter(this, void 0, void 0, function* () {
                yield this.models().userItem().remove(shareUserId, itemId);
            });
            const handleCreated = (change, item, share) => __awaiter(this, void 0, void 0, function* () {
                // console.info('CREATE ITEM', item);
                // console.info('CHANGE', change);
                // if (![ModelType.Note, ModelType.Folder, ModelType.Resource].includes(item.jop_type)) return;
                if (!item.jop_share_id)
                    return;
                const shareUserIds = yield this.allShareUserIds(share);
                for (const shareUserId of shareUserIds) {
                    if (shareUserId === change.user_id)
                        continue;
                    yield addUserItem(shareUserId, item.id);
                    if (item.jop_type === BaseModel_1.ModelType.Resource) {
                        // const resourceItem = await this.models().item().loadByName(change.user_id, resourceBlobPath(
                    }
                }
            });
            const handleUpdated = (change, item, share) => __awaiter(this, void 0, void 0, function* () {
                const previousItem = this.models().change().unserializePreviousItem(change.previous_item);
                const previousShareId = previousItem.jop_share_id;
                const shareId = share ? share.id : '';
                if (previousShareId === shareId)
                    return;
                const previousShare = previousShareId ? yield this.models().share().load(previousShareId) : null;
                if (previousShare) {
                    const shareUserIds = yield this.allShareUserIds(previousShare);
                    for (const shareUserId of shareUserIds) {
                        if (shareUserId === change.user_id)
                            continue;
                        yield removeUserItem(shareUserId, item.id);
                    }
                }
                if (share) {
                    const shareUserIds = yield this.allShareUserIds(share);
                    for (const shareUserId of shareUserIds) {
                        if (shareUserId === change.user_id)
                            continue;
                        yield addUserItem(shareUserId, item.id);
                    }
                }
            });
            // This function add any missing item to a user's collection. Normally
            // it shouldn't be necessary since items are added or removed based on
            // the Change events, but it seems it can happen anyway, possibly due to
            // a race condition somewhere. So this function corrects this by
            // re-assigning any missing items.
            //
            // It should be relatively quick to call since it's restricted to shares
            // that have recently changed, and the performed SQL queries are
            // index-based.
            const checkForMissingUserItems = (shares) => __awaiter(this, void 0, void 0, function* () {
                for (const share of shares) {
                    const realShareItemCount = yield this.itemCountByShareId(share.id);
                    const shareItemCountPerUser = yield this.itemCountByShareIdPerUser(share.id);
                    for (const row of shareItemCountPerUser) {
                        if (row.item_count < realShareItemCount) {
                            logger.warn(`checkForMissingUserItems: User is missing some items: Share ${share.id}: User ${row.user_id}`);
                            yield this.createSharedFolderUserItems(share.id, row.user_id);
                        }
                        else if (row.item_count > realShareItemCount) {
                            // Shouldn't be possible but log it just in case
                            logger.warn(`checkForMissingUserItems: User has too many items (??): Share ${share.id}: User ${row.user_id}`);
                        }
                    }
                }
            });
            // This loop essentially applies the change made by one user to all the
            // other users in the share.
            //
            // While it's processing changes, it's going to create new user_item
            // objects, which in turn generate more Change items, which are processed
            // again. However there are guards to ensure that it doesn't result in
            // an infinite loop - in particular once a user_item has been added,
            // adding it again will result in a UNIQUE constraint error and thus it
            // won't generate a Change object the second time.
            //
            // Rather than checking if the user_item exists before creating it, we
            // create it directly and let it fail, while catching the Unique error.
            // This is probably safer in terms of avoiding race conditions and
            // possibly faster.
            while (true) {
                const latestProcessedChange = yield this.models().keyValue().value('ShareService::latestProcessedChange');
                const paginatedChanges = yield this.models().change().allFromId(latestProcessedChange || '');
                const changes = paginatedChanges.items;
                if (!changes.length) {
                    yield this.models().keyValue().setValue('ShareService::latestProcessedChange', paginatedChanges.cursor);
                }
                else {
                    const items = yield this.models().item().loadByIds(changes.map(c => c.item_id));
                    const shareIds = (0, array_1.unique)(items.filter(i => !!i.jop_share_id).map(i => i.jop_share_id));
                    const shares = yield this.models().share().loadByIds(shareIds);
                    yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                        for (const change of changes) {
                            const item = items.find(i => i.id === change.item_id);
                            if (change.type === types_1.ChangeType.Create) {
                                yield handleCreated(change, item, shares.find(s => s.id === item.jop_share_id));
                            }
                            if (change.type === types_1.ChangeType.Update) {
                                yield handleUpdated(change, item, shares.find(s => s.id === item.jop_share_id));
                            }
                            // We don't need to handle ChangeType.Delete because when an
                            // item is deleted, all its associated userItems are deleted
                            // too.
                        }
                        yield checkForMissingUserItems(shares);
                        yield this.models().keyValue().setValue('ShareService::latestProcessedChange', paginatedChanges.cursor);
                    }), 'ShareService::updateSharedItems3');
                }
                if (!paginatedChanges.has_more)
                    break;
            }
        });
    }
    updateResourceShareStatus(doShare, _shareId, changerUserId, toUserId, resourceIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const resourceItems = yield this.models().item().loadByJopIds(changerUserId, resourceIds);
            const resourceBlobNames = resourceIds.map(id => (0, joplinUtils_1.resourceBlobPath)(id));
            const resourceBlobItems = yield this.models().item().loadByNames(changerUserId, resourceBlobNames);
            for (const resourceItem of resourceItems) {
                if (doShare) {
                    try {
                        yield this.models().userItem().add(toUserId, resourceItem.id, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
                    }
                    catch (error) {
                        if ((0, db_1.isUniqueConstraintError)(error)) {
                            continue;
                        }
                        throw error;
                    }
                }
                else {
                    yield this.models().userItem().remove(toUserId, resourceItem.id);
                }
            }
            for (const resourceBlobItem of resourceBlobItems) {
                if (doShare) {
                    try {
                        yield this.models().userItem().add(toUserId, resourceBlobItem.id, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
                    }
                    catch (error) {
                        if ((0, db_1.isUniqueConstraintError)(error)) {
                            continue;
                        }
                        throw error;
                    }
                }
                else {
                    yield this.models().userItem().remove(toUserId, resourceBlobItem.id);
                }
            }
        });
    }
    // The items that are added or removed from a share are processed by the
    // share service, and added as user_utems to each user. This function
    // however can be called after a user accept a share, or to correct share
    // errors, but re-assigning all items to a user.
    createSharedFolderUserItems(shareId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.models().item().byShareIdQuery(shareId, { fields: ['id', 'name'] });
            yield this.models().userItem().addMulti(userId, query);
        });
    }
    shareFolder(owner, folderId, masterKeyId) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const folderItem = yield this.models().item().loadByJopId(owner.id, folderId);
            if (!folderItem)
                throw new errors_1.ErrorNotFound(`No such folder: ${folderId}`);
            const share = yield this.models().share().byUserAndItemId(owner.id, folderItem.id);
            if (share)
                return share;
            const shareToSave = {
                type: types_1.ShareType.Folder,
                item_id: folderItem.id,
                owner_id: owner.id,
                folder_id: folderId,
                master_key_id: masterKeyId,
            };
            yield this.checkIfAllowed(owner, BaseModel_2.AclAction.Create, shareToSave);
            return _super.save.call(this, shareToSave);
        });
    }
    shareNote(owner, noteId, masterKeyId, recursive) {
        return __awaiter(this, void 0, void 0, function* () {
            const noteItem = yield this.models().item().loadByJopId(owner.id, noteId);
            if (!noteItem)
                throw new errors_1.ErrorNotFound(`No such note: ${noteId}`);
            const existingShare = yield this.byItemAndRecursive(noteItem.id, recursive);
            if (existingShare)
                return existingShare;
            const shareToSave = {
                type: types_1.ShareType.Note,
                item_id: noteItem.id,
                owner_id: owner.id,
                note_id: noteId,
                master_key_id: masterKeyId,
                recursive: recursive ? 1 : 0,
            };
            yield this.checkIfAllowed(owner, BaseModel_2.AclAction.Create, shareToSave);
            return this.save(shareToSave);
        });
    }
    delete(id, options = {}) {
        const _super = Object.create(null, {
            delete: { get: () => super.delete }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const ids = typeof id === 'string' ? [id] : id;
            const shares = yield this.loadByIds(ids);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const share of shares) {
                    yield this.models().shareUser().deleteByShare(share);
                    yield this.models().userItem().deleteByShare({ id: share.id, owner_id: share.owner_id });
                    yield _super.delete.call(this, share.id, options);
                }
            }), 'ShareModel::delete');
        });
    }
    deleteByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const shares = yield this.sharesByUser(userId);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const share of shares) {
                    yield this.delete(share.id);
                }
            }), 'ShareModel::deleteByUserId');
        });
    }
    itemCountByShareId(shareId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this
                .db('items')
                .count('id', { as: 'item_count' })
                .where('jop_share_id', '=', shareId);
            return r[0].item_count;
        });
    }
    itemCountByShareIdPerUser(shareId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db('user_items')
                .select(this.db.raw('user_id, count(user_id) as item_count'))
                .whereIn('item_id', this.db('items')
                .select('id')
                .where('jop_share_id', '=', shareId)).groupBy('user_id');
        });
    }
}
exports.default = ShareModel;
//# sourceMappingURL=ShareModel.js.map