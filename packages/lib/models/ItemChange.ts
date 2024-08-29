import BaseModel, { ModelType } from '../BaseModel';
import shim from '../shim';
import eventManager, { EventName, ItemChangeEvent } from '../eventManager';
import { ItemChangeEntity, SqlQuery } from '../services/database/types';
const Mutex = require('async-mutex').Mutex;

export interface ChangeSinceIdOptions {
	limit?: number;
	fields?: string[];
}

export default class ItemChange extends BaseModel {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static addChangeMutex_: any = new Mutex();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static saveCalls_: any[] = [];

	public static TYPE_CREATE = 1;
	public static TYPE_UPDATE = 2;
	public static TYPE_DELETE = 3;

	public static SOURCE_UNSPECIFIED = 1;
	public static SOURCE_SYNC = 2;
	public static SOURCE_DECRYPTION = 2; // CAREFUL - SAME ID AS SOURCE_SYNC!
	public static SOURCE_SHARE_SERVICE = 4;

	public static tableName() {
		return 'item_changes';
	}

	public static modelType() {
		return BaseModel.TYPE_ITEM_CHANGE;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async addMulti(itemType: ModelType, itemIds: string[], type: number, changeSource: any = null, beforeChangeItemJsons: string[] = null) {
		if (!itemIds.length) return;

		if (changeSource === null) changeSource = ItemChange.SOURCE_UNSPECIFIED;
		if (beforeChangeItemJsons && beforeChangeItemJsons.length !== itemIds.length) throw new Error('beforeChangeItemJsons does not match itemIds');

		ItemChange.saveCalls_.push(true);

		// Using a mutex so that records can be added to the database in the
		// background, without making the UI wait.
		const release = await ItemChange.addChangeMutex_.acquire();

		try {
			const queries: SqlQuery[] = [];

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
		} finally {
			release();
			ItemChange.saveCalls_.pop();

			for (const itemId of itemIds) {
				const event: ItemChangeEvent = {
					itemType: itemType,
					itemId: itemId,
					eventType: type,
				};
				eventManager.emit(EventName.ItemChange, event);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async add(itemType: ModelType, itemId: string, type: number, changeSource: any = null, beforeChangeItemJson: string = null) {
		await this.addMulti(itemType, [itemId], type, changeSource, beforeChangeItemJson ? [beforeChangeItemJson] : null);
	}

	public static async lastChangeId() {
		const row = await this.db().selectOne('SELECT max(id) as max_id FROM item_changes');
		return row && row.max_id ? row.max_id : 0;
	}

	// Because item changes are recorded in the background, this function
	// can be used for synchronous code, in particular when unit testing.
	public static async waitForAllSaved() {
		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!ItemChange.saveCalls_.length) {
					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}

	public static async deleteOldChanges(lowestChangeId: number, itemMinTtl: number) {
		if (!lowestChangeId) return;

		const cutOffDate = Date.now() - itemMinTtl;

		return this.db().exec(`
			DELETE FROM item_changes
			WHERE id <= ?
			AND created_time <= ?
		`, [lowestChangeId, cutOffDate]);
	}

	public static async changesSinceId(changeId: number, options: ChangeSinceIdOptions = null): Promise<ItemChangeEntity[]> {
		options = {
			limit: 100,
			fields: ['id', 'item_type', 'item_id', 'type', 'created_time'],
			...options,
		};

		return this.db().selectAll(`
			SELECT ${this.db().escapeFieldsToString(options.fields)}
			FROM item_changes
			WHERE id > ?
			ORDER BY id
			LIMIT ?
		`, [changeId, options.limit]);
	}

}
