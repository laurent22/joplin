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
const BaseModel_1 = require("./BaseModel");
const array_1 = require("../utils/array");
const errors_1 = require("../utils/errors");
class UserItemModel extends BaseModel_1.default {
    get tableName() {
        return 'user_items';
    }
    hasUuid() {
        return false;
    }
    remove(userId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteByUserItem(userId, itemId);
        });
    }
    userIdsByItemIds(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db(this.tableName).select('item_id', 'user_id').whereIn('item_id', itemIds);
            const output = {};
            for (const row of rows) {
                if (!output[row.item_id])
                    output[row.item_id] = [];
                output[row.item_id].push(row.user_id);
            }
            return output;
        });
    }
    byItemIds(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
        });
    }
    byShareId(shareId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .leftJoin('items', 'user_items.item_id', 'items.id')
                .select(this.selectFields(options, this.defaultFields, 'user_items'))
                .where('items.jop_share_id', '=', shareId);
        });
    }
    byShareAndUserId(shareId, userId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .leftJoin('items', 'user_items.item_id', 'items.id')
                .select(this.selectFields(options, this.defaultFields, 'user_items'))
                .where('items.jop_share_id', '=', shareId)
                .where('user_items.user_id', '=', userId);
        });
    }
    byUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).where('user_id', '=', userId);
        });
    }
    byUserAndItemId(userId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).where('user_id', '=', userId).where('item_id', '=', itemId).first();
        });
    }
    // Returns any user item that is part of a share
    itemsInShare(userId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .leftJoin('items', 'user_items.item_id', 'items.id')
                .select(this.selectFields(options, this.defaultFields, 'user_items'))
                .where('items.jop_share_id', '!=', '')
                .where('user_items.user_id', '=', userId);
        });
    }
    deleteByUserItem(userId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userItem = yield this.byUserAndItemId(userId, itemId);
            if (!userItem)
                throw new errors_1.ErrorNotFound(`No such user_item: ${userId} / ${itemId}`);
            yield this.deleteBy({ byUserItem: userItem });
        });
    }
    deleteByItemIds(itemIds, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteBy(Object.assign(Object.assign({}, options), { byItemIds: itemIds }));
        });
    }
    deleteByShareId(shareId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteBy({ byShareId: shareId });
        });
    }
    deleteByShare(share) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteBy({ byShare: share });
        });
    }
    deleteByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteBy({ byUserId: userId });
        });
    }
    deleteByUserItemIds(userItemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteBy({ byUserItemIds: userItemIds });
        });
    }
    deleteByShareAndUserId(shareId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteBy({ byShareId: shareId, byUserId: userId });
        });
    }
    add(userId, itemId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.models().item().load(itemId, { fields: ['id', 'name'] });
            yield this.addMulti(userId, [item], options);
        });
    }
    addMulti(userId, itemsQuery, options = {}) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const items = Array.isArray(itemsQuery) ? itemsQuery : yield itemsQuery.whereNotIn('id', this.db('user_items').select('item_id').where('user_id', '=', userId));
            if (!items.length)
                return;
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const item of items) {
                    if (!('name' in item) || !('id' in item))
                        throw new Error('item.id and item.name must be set');
                    yield _super.save.call(this, {
                        user_id: userId,
                        item_id: item.id,
                    }, options);
                    if (this.models().item().shouldRecordChange(item.name)) {
                        yield this.models().change().save({
                            item_type: types_1.ItemType.UserItem,
                            item_id: item.id,
                            item_name: item.name,
                            type: types_1.ChangeType.Create,
                            previous_item: '',
                            user_id: userId,
                        });
                    }
                }
            }), 'UserItemModel::addMulti');
        });
    }
    save(_userItem, _options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Call add() or addMulti()');
        });
    }
    delete(_id, _options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Use one of the deleteBy methods');
        });
    }
    deleteBy(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ recordChanges: true }, options);
            let userItems = [];
            if (options.byShareId && options.byUserId) {
                userItems = yield this.byShareAndUserId(options.byShareId, options.byUserId);
            }
            else if (options.byItemIds) {
                userItems = yield this.byItemIds(options.byItemIds);
            }
            else if (options.byShareId) {
                userItems = yield this.byShareId(options.byShareId);
            }
            else if (options.byShare) {
                userItems = yield this.byShareId(options.byShare.id);
                userItems = userItems.filter(u => u.user_id !== options.byShare.owner_id);
            }
            else if (options.byUserId) {
                userItems = yield this.byUserId(options.byUserId);
            }
            else if (options.byUserItem) {
                userItems = [options.byUserItem];
            }
            else if (options.byUserItemIds) {
                userItems = yield this.loadByIds(options.byUserItemIds);
            }
            else {
                throw new Error('Invalid options');
            }
            const itemIds = (0, array_1.unique)(userItems.map(ui => ui.item_id));
            const items = yield this.models().item().loadByIds(itemIds, { fields: ['id', 'name'] });
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const userItem of userItems) {
                    const item = items.find(i => i.id === userItem.item_id);
                    if (options.recordChanges && this.models().item().shouldRecordChange(item.name)) {
                        yield this.models().change().save({
                            item_type: types_1.ItemType.UserItem,
                            item_id: userItem.item_id,
                            item_name: item.name,
                            type: types_1.ChangeType.Delete,
                            previous_item: '',
                            user_id: userItem.user_id,
                        });
                    }
                }
                yield this.db(this.tableName).whereIn('id', userItems.map(ui => ui.id)).delete();
            }), 'ItemModel::delete');
        });
    }
}
exports.default = UserItemModel;
//# sourceMappingURL=UserItemModel.js.map