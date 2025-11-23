"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../BaseModel");
const shim_1 = require("../shim");
const eventManager_1 = require("../eventManager");
const Mutex = require('async-mutex').Mutex;
class ItemChange extends BaseModel_1.default {
    static tableName() {
        return 'item_changes';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_ITEM_CHANGE;
    }
    static async addMulti(itemType, itemIds, type, { changeSource = null, changeId = null, beforeChangeItemJsons = null } = {}) {
        if (!itemIds.length)
            return;
        if (changeSource === null)
            changeSource = ItemChange.SOURCE_UNSPECIFIED;
        if (beforeChangeItemJsons && beforeChangeItemJsons.length !== itemIds.length)
            throw new Error('beforeChangeItemJsons does not match itemIds');
        ItemChange.saveCalls_.push(true);
        // Using a mutex so that records can be added to the database in the
        // background, without making the UI wait.
        const release = await ItemChange.addChangeMutex_.acquire();
        try {
            const queries = [];
            for (let i = 0; i < itemIds.length; i++) {
                const itemId = itemIds[i];
                const beforeChangeItemJson = beforeChangeItemJsons ? beforeChangeItemJsons[i] : '';
                queries.push({
                    sql: 'DELETE FROM item_changes WHERE item_id = ?',
                    params: [itemId],
                });
                queries.push({
                    sql: 'INSERT INTO item_changes (item_type, item_id, type, source, created_time, before_change_item) VALUES (?, ?, ?, ?, ?, ?)',
                    params: [itemType, itemId, type, changeSource, Date.now(), beforeChangeItemJson],
                });
            }
            await this.db().transactionExecBatch(queries);
        }
        finally {
            release();
            ItemChange.saveCalls_.pop();
            for (const itemId of itemIds) {
                eventManager_1.default.emit(eventManager_1.EventName.ItemChange, {
                    itemType: itemType,
                    itemId,
                    changeId,
                    eventType: type,
                });
            }
        }
    }
    static async add(itemType, itemId, type, options = {}) {
        await this.addMulti(itemType, [itemId], type, Object.assign(Object.assign({}, options), { beforeChangeItemJsons: (options === null || options === void 0 ? void 0 : options.beforeChangeItemJson) ? [options.beforeChangeItemJson] : null }));
    }
    static async lastChangeId() {
        const row = await this.db().selectOne('SELECT max(id) as max_id FROM item_changes');
        return row && row.max_id ? row.max_id : 0;
    }
    // Because item changes are recorded in the background, this function
    // can be used for synchronous code, in particular when unit testing.
    static async waitForAllSaved() {
        return new Promise((resolve) => {
            const iid = shim_1.default.setInterval(() => {
                if (!ItemChange.saveCalls_.length) {
                    shim_1.default.clearInterval(iid);
                    resolve(null);
                }
            }, 100);
        });
    }
    static async deleteOldChanges(lowestChangeId, itemMinTtl) {
        if (!lowestChangeId)
            return;
        const cutOffDate = Date.now() - itemMinTtl;
        return this.db().exec(`
			DELETE FROM item_changes
			WHERE id <= ?
			AND created_time <= ?
		`, [lowestChangeId, cutOffDate]);
    }
    static async changesSinceId(changeId, options = null) {
        options = Object.assign({ limit: 100, fields: ['id', 'item_type', 'item_id', 'type', 'created_time'] }, options);
        return this.db().selectAll(`
			SELECT ${this.db().escapeFieldsToString(options.fields)}
			FROM item_changes
			WHERE id > ?
			ORDER BY id
			LIMIT ?
		`, [changeId, options.limit]);
    }
    static async oldNoteContent(noteId) {
        const row = await this.db().selectOne(`
			SELECT before_change_item
			FROM item_changes
			WHERE item_type = ? AND item_id = ?
			ORDER BY created_time DESC
			LIMIT 1
		`, [BaseModel_1.ModelType.Note, noteId]);
        return row && row.before_change_item ? row.before_change_item : null;
    }
    static async updateOldNoteContent(noteId, beforeChangeItemJson) {
        const beforeChangeItem = beforeChangeItemJson ? beforeChangeItemJson : '';
        return this.db().exec(`
			UPDATE item_changes SET before_change_item = ? WHERE item_type = ? AND item_id = ?
		`, [beforeChangeItem, BaseModel_1.ModelType.Note, noteId]);
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
ItemChange.addChangeMutex_ = new Mutex();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
ItemChange.saveCalls_ = [];
ItemChange.TYPE_CREATE = 1;
ItemChange.TYPE_UPDATE = 2;
ItemChange.TYPE_DELETE = 3;
ItemChange.SOURCE_UNSPECIFIED = 1;
ItemChange.SOURCE_SYNC = 2;
ItemChange.SOURCE_DECRYPTION = 2; // CAREFUL - SAME ID AS SOURCE_SYNC!
ItemChange.SOURCE_SHARE_SERVICE = 4;
exports.default = ItemChange;
