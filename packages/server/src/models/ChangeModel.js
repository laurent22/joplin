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
exports.requestDeltaPagination = exports.defaultDeltaPagination = exports.defaultChangeTtl = void 0;
const Logger_1 = require("@joplin/lib/Logger");
const db_1 = require("../db");
const types_1 = require("../services/database/types");
const crypto_1 = require("../utils/crypto");
const errors_1 = require("../utils/errors");
const time_1 = require("../utils/time");
const BaseModel_1 = require("./BaseModel");
const pagination_1 = require("./utils/pagination");
const logger = Logger_1.default.create('ChangeModel');
exports.defaultChangeTtl = 180 * time_1.Day;
function defaultDeltaPagination() {
    return {
        limit: 100,
        cursor: '',
    };
}
exports.defaultDeltaPagination = defaultDeltaPagination;
function requestDeltaPagination(query) {
    if (!query)
        return defaultDeltaPagination();
    const output = {};
    if ('limit' in query)
        output.limit = query.limit;
    if ('cursor' in query)
        output.cursor = query.cursor;
    return output;
}
exports.requestDeltaPagination = requestDeltaPagination;
class ChangeModel extends BaseModel_1.default {
    get tableName() {
        return 'changes';
    }
    hasUuid() {
        return true;
    }
    serializePreviousItem(item) {
        return JSON.stringify(item);
    }
    unserializePreviousItem(item) {
        if (!item)
            return null;
        return JSON.parse(item);
    }
    changeUrl() {
        return `${this.baseUrl}/changes`;
    }
    allFromId(id, limit = db_1.SqliteMaxVariableNum) {
        return __awaiter(this, void 0, void 0, function* () {
            const startChange = id ? yield this.load(id) : null;
            const query = this.db(this.tableName).select(...this.defaultFields);
            if (startChange)
                void query.where('counter', '>', startChange.counter);
            void query.limit(limit);
            let results = yield query;
            const hasMore = !!results.length;
            const cursor = results.length ? results[results.length - 1].id : id;
            results = yield this.removeDeletedItems(results);
            results = yield this.compressChanges(results);
            return {
                items: results,
                has_more: hasMore,
                cursor,
            };
        });
    }
    changesForUserQuery(userId, count) {
        // When need to get:
        //
        // - All the CREATE and DELETE changes associated with the user
        // - All the UPDATE changes that applies to items associated with the
        //   user.
        //
        // UPDATE changes do not have the user_id set because they are specific
        // to the item, not to a particular user.
        const query = this
            .db('changes')
            .where(function () {
            void this.whereRaw('((type = ? OR type = ?) AND user_id = ?)', [types_1.ChangeType.Create, types_1.ChangeType.Delete, userId])
                // Need to use a RAW query here because Knex has a "not a
                // bug" bug that makes it go into infinite loop in some
                // contexts, possibly only when running inside Jest (didn't
                // test outside).
                // https://github.com/knex/knex/issues/1851
                .orWhereRaw('type = ? AND item_id IN (SELECT item_id FROM user_items WHERE user_id = ?)', [types_1.ChangeType.Update, userId]);
        });
        if (count) {
            void query.countDistinct('id', { as: 'total' });
        }
        else {
            void query.select([
                'id',
                'item_id',
                'item_name',
                'type',
                'updated_time',
            ]);
        }
        return query;
    }
    allByUser(userId, pagination = null) {
        return __awaiter(this, void 0, void 0, function* () {
            pagination = Object.assign({ page: 1, limit: 100, order: [{ by: 'counter', dir: pagination_1.PaginationOrderDir.ASC }] }, pagination);
            const query = this.changesForUserQuery(userId, false);
            const countQuery = this.changesForUserQuery(userId, true);
            const itemCount = (yield countQuery.first()).total;
            void query
                .orderBy(pagination.order[0].by, pagination.order[0].dir)
                .offset((pagination.page - 1) * pagination.limit)
                .limit(pagination.limit);
            const changes = yield query;
            return {
                items: changes,
                // If we have changes, we return the ID of the latest changes from which delta sync can resume.
                // If there's no change, we return the previous cursor.
                cursor: changes.length ? changes[changes.length - 1].id : pagination.cursor,
                has_more: changes.length >= pagination.limit,
                page_count: itemCount !== null ? Math.ceil(itemCount / pagination.limit) : undefined,
            };
        });
    }
    delta(userId, pagination = null) {
        return __awaiter(this, void 0, void 0, function* () {
            pagination = Object.assign(Object.assign({}, defaultDeltaPagination()), pagination);
            let changeAtCursor = null;
            if (pagination.cursor) {
                changeAtCursor = (yield this.load(pagination.cursor));
                if (!changeAtCursor)
                    throw new errors_1.ErrorResyncRequired();
            }
            const query = this.changesForUserQuery(userId, false);
            // If a cursor was provided, apply it to the query.
            if (changeAtCursor) {
                void query.where('counter', '>', changeAtCursor.counter);
            }
            void query
                .orderBy('counter', 'asc')
                .limit(pagination.limit);
            const changes = yield query;
            const items = yield this.db('items').select('id', 'jop_updated_time').whereIn('items.id', changes.map(c => c.item_id));
            let processedChanges = this.compressChanges(changes);
            processedChanges = yield this.removeDeletedItems(processedChanges, items);
            const finalChanges = processedChanges.map(c => {
                const item = items.find(item => item.id === c.item_id);
                if (!item)
                    return c;
                return Object.assign(Object.assign({}, c), { jop_updated_time: item.jop_updated_time });
            });
            return {
                items: finalChanges,
                // If we have changes, we return the ID of the latest changes from which delta sync can resume.
                // If there's no change, we return the previous cursor.
                cursor: changes.length ? changes[changes.length - 1].id : pagination.cursor,
                has_more: changes.length >= pagination.limit,
            };
        });
    }
    removeDeletedItems(changes, items = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemIds = changes.map(c => c.item_id);
            // We skip permission check here because, when an item is shared, we need
            // to fetch files that don't belong to the current user. This check
            // would not be needed anyway because the change items are generated in
            // a context where permissions have already been checked.
            items = items === null ? yield this.db('items').select('id').whereIn('items.id', itemIds) : items;
            const output = [];
            for (const change of changes) {
                const item = items.find(f => f.id === change.item_id);
                // If the item associated with this change has been deleted, we have
                // two cases:
                // - If it's a "delete" change, add it to the list.
                // - If it's anything else, skip it. The "delete" change will be
                //   sent on one of the next pages.
                if (!item && change.type !== types_1.ChangeType.Delete) {
                    continue;
                }
                output.push(change);
            }
            return output;
        });
    }
    // Compresses the changes so that, for example, multiple updates on the same
    // item are reduced down to one, because calling code usually only needs to
    // know that the item has changed at least once. The reduction is basically:
    //
    //     create - update => create
    //     create - delete => NOOP
    //     update - update => update
    //     update - delete => delete
    //     delete - create => create
    //
    // There's one exception for changes that include a "previous_item". This is
    // used to save specific properties about the previous state of the item,
    // such as "jop_parent_id" or "name", which is used by the share mechanism
    // to know if an item has been moved from one folder to another. In that
    // case, we need to know about each individual change, so they are not
    // compressed.
    //
    // The latest change, when an item goes from DELETE to CREATE seems odd but
    // can happen because we are not checking for "item" changes but for
    // "user_item" changes. When sharing is involved, an item can be shared
    // (CREATED), then unshared (DELETED), then shared again (CREATED). When it
    // happens, we want the user to get the item, thus we generate a CREATE
    // event.
    compressChanges(changes) {
        const itemChanges = {};
        const uniqueUpdateChanges = {};
        for (const change of changes) {
            const itemId = change.item_id;
            const previous = itemChanges[itemId];
            if (change.type === types_1.ChangeType.Update) {
                const key = (0, crypto_1.md5)(itemId + change.previous_item);
                if (!uniqueUpdateChanges[itemId])
                    uniqueUpdateChanges[itemId] = {};
                uniqueUpdateChanges[itemId][key] = change;
            }
            if (previous) {
                if (previous.type === types_1.ChangeType.Create && change.type === types_1.ChangeType.Update) {
                    continue;
                }
                if (previous.type === types_1.ChangeType.Create && change.type === types_1.ChangeType.Delete) {
                    delete itemChanges[itemId];
                }
                if (previous.type === types_1.ChangeType.Update && change.type === types_1.ChangeType.Update) {
                    itemChanges[itemId] = change;
                }
                if (previous.type === types_1.ChangeType.Update && change.type === types_1.ChangeType.Delete) {
                    itemChanges[itemId] = change;
                }
                if (previous.type === types_1.ChangeType.Delete && change.type === types_1.ChangeType.Create) {
                    itemChanges[itemId] = change;
                }
            }
            else {
                itemChanges[itemId] = change;
            }
        }
        const output = [];
        for (const itemId in itemChanges) {
            const change = itemChanges[itemId];
            if (change.type === types_1.ChangeType.Update) {
                for (const key of Object.keys(uniqueUpdateChanges[itemId])) {
                    output.push(uniqueUpdateChanges[itemId][key]);
                }
            }
            else {
                output.push(change);
            }
        }
        output.sort((a, b) => a.counter < b.counter ? -1 : +1);
        return output;
    }
    // See spec for complete documentation:
    // https://joplinapp.org/spec/server_delta_sync/#regarding-the-deletion-of-old-change-events
    compressOldChanges(ttl = null) {
        return __awaiter(this, void 0, void 0, function* () {
            ttl = ttl === null ? exports.defaultChangeTtl : ttl;
            const cutOffDate = Date.now() - ttl;
            const limit = 1000;
            const doneItemIds = [];
            let error = null;
            let totalDeletedCount = 0;
            logger.info(`compressOldChanges: Processing changes older than: ${(0, time_1.formatDateTime)(cutOffDate)} (${cutOffDate})`);
            while (true) {
                // First get all the UPDATE changes before the specified date, and
                // order by the items that had the most changes. Also for each item
                // get the most recent change date from within that time interval,
                // as we need this below.
                const changeReport = yield this
                    .db(this.tableName)
                    .select(['item_id'])
                    .countDistinct('id', { as: 'total' })
                    .max('created_time', { as: 'max_created_time' })
                    .where('type', '=', types_1.ChangeType.Update)
                    .where('created_time', '<', cutOffDate)
                    .groupBy('item_id')
                    .havingRaw('count(id) > 1')
                    .orderBy('total', 'desc')
                    .limit(limit);
                if (!changeReport.length)
                    break;
                yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                    for (const row of changeReport) {
                        if (doneItemIds.includes(row.item_id)) {
                            // We don't throw from within the transaction because
                            // that would rollback all other operations even though
                            // they are valid. So we save the error and exit.
                            error = new Error(`Trying to process an item that has already been done. Aborting. Row: ${JSON.stringify(row)}`);
                            return;
                        }
                        // Still from within the specified interval, delete all
                        // UPDATE changes, except for the most recent one.
                        const deletedCount = yield this
                            .db(this.tableName)
                            .where('type', '=', types_1.ChangeType.Update)
                            .where('created_time', '<', cutOffDate)
                            .where('created_time', '!=', row.max_created_time)
                            .where('item_id', '=', row.item_id)
                            .delete();
                        totalDeletedCount += deletedCount;
                        doneItemIds.push(row.item_id);
                    }
                }), 'ChangeModel::compressOldChanges');
                logger.info(`compressOldChanges: Processed: ${doneItemIds.length} items. Deleted: ${totalDeletedCount} changes.`);
                if (error)
                    throw error;
            }
            logger.info(`compressOldChanges: Finished processing. Done ${doneItemIds.length} items. Deleted: ${totalDeletedCount} changes.`);
        });
    }
    save(change, options = {}) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const savedChange = yield _super.save.call(this, change, options);
            ChangeModel.eventEmitter.emit('saved');
            return savedChange;
        });
    }
    deleteByItemIds(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!itemIds.length)
                return;
            yield this.db(this.tableName)
                .whereIn('item_id', itemIds)
                .delete();
        });
    }
}
exports.default = ChangeModel;
//# sourceMappingURL=ChangeModel.js.map