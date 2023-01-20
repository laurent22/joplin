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
const joplinUtils_1 = require("../utils/joplinUtils");
const BaseModel_1 = require("./BaseModel");
class ItemResourceModel extends BaseModel_1.default {
    get tableName() {
        return 'item_resources';
    }
    hasUuid() {
        return false;
    }
    autoTimestampEnabled() {
        return false;
    }
    deleteByItemIds(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).whereIn('item_id', itemIds).delete();
        });
    }
    deleteByItemId(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.deleteByItemIds([itemId]);
        });
    }
    addResourceIds(itemId, resourceIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!resourceIds.length)
                return;
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const resourceId of resourceIds) {
                    yield this.save({
                        item_id: itemId,
                        resource_id: resourceId,
                    });
                }
            }), 'ItemResourceModel::addResourceIds');
        });
    }
    byItemId(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.byItemIds([itemId]);
            return Object.keys(r).length ? r[itemId] : [];
        });
    }
    byItemIds(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db(this.tableName).select('item_id', 'resource_id').whereIn('item_id', itemIds);
            const output = {};
            for (const row of rows) {
                if (!output[row.item_id])
                    output[row.item_id] = [];
                output[row.item_id].push(row.resource_id);
            }
            return output;
        });
    }
    itemIdsByResourceId(resourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db(this.tableName).select('item_id').where('resource_id', '=', resourceId);
            return rows.map(r => r.item_id);
        });
    }
    blobItemsByResourceIds(userIds, resourceIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const resourceBlobNames = resourceIds.map(id => (0, joplinUtils_1.resourceBlobPath)(id));
            return this.models().item().loadByNames(userIds, resourceBlobNames);
        });
    }
    itemTree(rootItemId, rootJopId, currentItemIds = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this
                .db('item_resources')
                .leftJoin('items', 'item_resources.resource_id', 'items.jop_id')
                .select('items.id', 'items.jop_id')
                .where('item_resources.item_id', '=', rootItemId);
            const output = [];
            // Only process the children if the parent ID is not already in the
            // tree. This is to prevent an infinite loop if one of the leaves links
            // to a descendant note.
            if (!currentItemIds.includes(rootJopId)) {
                currentItemIds.push(rootJopId);
                for (const row of rows) {
                    const subTree = yield this.itemTree(row.id, row.jop_id, currentItemIds);
                    output.push({
                        item_id: row.id,
                        resource_id: row.jop_id,
                        children: subTree.children,
                    });
                }
            }
            return {
                item_id: rootItemId,
                resource_id: rootJopId,
                children: output,
            };
        });
    }
}
exports.default = ItemResourceModel;
//# sourceMappingURL=ItemResourceModel.js.map