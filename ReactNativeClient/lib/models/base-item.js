const { BaseModel } = require('lib/base-model.js');
const { Database } = require('lib/database.js');
const { Setting } = require('lib/models/setting.js');
const { time } = require('lib/time-utils.js');
const { sprintf } = require('sprintf-js');
const moment = require('moment');

class BaseItem extends BaseModel {

	static useUuid() {
		return true;
	}

	static encryptionSupported() {
		return true;
	}

	static loadClass(className, classRef) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].className == className) {
				BaseItem.syncItemDefinitions_[i].classRef = classRef;
				return;
			}
		}

		throw new Error('Invalid class name: ' + className);
	}

	// Need to dynamically load the classes like this to avoid circular dependencies
	static getClass(name) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].className == name) {
				return BaseItem.syncItemDefinitions_[i].classRef;
			}
		}

		throw new Error('Invalid class name: ' + name);
	}

	static getClassByItemType(itemType) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].type == itemType) {
				return BaseItem.syncItemDefinitions_[i].classRef;
			}
		}

		throw new Error('Invalid item type: ' + itemType);
	}

	static async syncedCount(syncTarget) {
		const ItemClass = this.itemClass(this.modelType());
		const itemType = ItemClass.modelType();
		// The fact that we don't check if the item_id still exist in the corresponding item table, means
		// that the returned number might be innaccurate (for example if a sync operation was cancelled)
		const sql = 'SELECT count(*) as total FROM sync_items WHERE sync_target = ? AND item_type = ?';
		const r = await this.db().selectOne(sql, [ syncTarget, itemType ]);
		return r.total;
	}

	static systemPath(itemOrId) {
		if (typeof itemOrId === 'string') return itemOrId + '.md';
		return itemOrId.id + '.md';
	}

	static isSystemPath(path) {
		// 1b175bb38bba47baac22b0b47f778113.md
		if (!path || !path.length) return false;
		let p = path.split('/');
		p = p[p.length - 1];
		p = p.split('.');
		if (p.length != 2) return false;
		return p[0].length == 32 && p[1] == 'md';
	}

	static itemClass(item) {
		if (!item) throw new Error('Item cannot be null');

		if (typeof item === 'object') {
			if (!('type_' in item)) throw new Error('Item does not have a type_ property');
			return this.itemClass(item.type_);
		} else {
			for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
				let d = BaseItem.syncItemDefinitions_[i];
				if (Number(item) == d.type) return this.getClass(d.className);
			}
			throw new Error('Unknown type: ' + item);
		}
	}

	// Returns the IDs of the items that have been synced at least once
	static async syncedItemIds(syncTarget) {
		if (!syncTarget) throw new Error('No syncTarget specified');
		let temp = await this.db().selectAll('SELECT item_id FROM sync_items WHERE sync_time > 0 AND sync_target = ?', [syncTarget]);
		let output = [];
		for (let i = 0; i < temp.length; i++) {
			output.push(temp[i].item_id);
		}
		return output;
	}

	static pathToId(path) {
		let p = path.split('/');
		let s = p[p.length - 1].split('.');
		return s[0];
	}

	static loadItemByPath(path) {
		return this.loadItemById(this.pathToId(path));
	}

	static async loadItemById(id) {
		let classes = this.syncItemClassNames();
		for (let i = 0; i < classes.length; i++) {
			let item = await this.getClass(classes[i]).load(id);
			if (item) return item;
		}
		return null;
	}

	static loadItemByField(itemType, field, value) {
		let ItemClass = this.itemClass(itemType);
		return ItemClass.loadByField(field, value);
	}

	static loadItem(itemType, id) {
		let ItemClass = this.itemClass(itemType);
		return ItemClass.load(id);
	}

	static deleteItem(itemType, id) {
		let ItemClass = this.itemClass(itemType);
		return ItemClass.delete(id);
	}

	static async delete(id, options = null) {
		return this.batchDelete([id], options);
	}

	static async batchDelete(ids, options = null) {
		let trackDeleted = true;
		if (options && options.trackDeleted !== null && options.trackDeleted !== undefined) trackDeleted = options.trackDeleted;

		// Don't create a deleted_items entry when conflicted notes are deleted
		// since no other client have (or should have) them.
		let conflictNoteIds = [];
		if (this.modelType() == BaseModel.TYPE_NOTE) {
			const conflictNotes = await this.db().selectAll('SELECT id FROM notes WHERE id IN ("' + ids.join('","') + '") AND is_conflict = 1');
			conflictNoteIds = conflictNotes.map((n) => { return n.id });
		}

		await super.batchDelete(ids, options);

		if (trackDeleted) {
			const syncTargetIds = Setting.enumOptionValues('sync.target');
			let queries = [];
			let now = time.unixMs();
			for (let i = 0; i < ids.length; i++) {
				if (conflictNoteIds.indexOf(ids[i]) >= 0) continue;

				// For each deleted item, for each sync target, we need to add an entry in deleted_items.
				// That way, each target can later delete the remote item.
				for (let j = 0; j < syncTargetIds.length; j++) {
					queries.push({
						sql: 'INSERT INTO deleted_items (item_type, item_id, deleted_time, sync_target) VALUES (?, ?, ?, ?)',
						params: [this.modelType(), ids[i], now, syncTargetIds[j]],
					});
				}
			}
			await this.db().transactionExecBatch(queries);
		}
	}

	static deletedItems(syncTarget) {
		return this.db().selectAll('SELECT * FROM deleted_items WHERE sync_target = ?', [syncTarget]);
	}

	static async deletedItemCount(syncTarget) {
		let r = await this.db().selectOne('SELECT count(*) as total FROM deleted_items WHERE sync_target = ?', [syncTarget]);
		return r['total'];
	}

	static remoteDeletedItem(syncTarget, itemId) {
		return this.db().exec('DELETE FROM deleted_items WHERE item_id = ? AND sync_target = ?', [itemId, syncTarget]);
	}

	static serialize_format(propName, propValue) {
		if (['created_time', 'updated_time', 'sync_time', 'user_updated_time', 'user_created_time'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = moment.unix(propValue / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
		} else if (propValue === null || propValue === undefined) {
			propValue = '';
		}

		return propValue;
	}

	static unserialize_format(type, propName, propValue) {
		if (propName[propName.length - 1] == '_') return propValue; // Private property

		let ItemClass = this.itemClass(type);

		if (['created_time', 'updated_time', 'user_created_time', 'user_updated_time'].indexOf(propName) >= 0) {
			if (!propValue) return 0;
			propValue = moment(propValue, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x');
		} else {
			propValue = Database.formatValue(ItemClass.fieldType(propName), propValue);
		}

		return propValue;
	}

	static async serialize(item, type = null, shownKeys = null) {
		item = this.filter(item);

		let output = {};

		if ('title' in item && shownKeys.indexOf('title') >= 0) {
			output.title = item.title;
		}

		if ('body' in item && shownKeys.indexOf('body') >= 0) {
			output.body = item.body;
		}

		output.props = [];

		for (let i = 0; i < shownKeys.length; i++) {
			let key = shownKeys[i];
			if (key == 'title' || key == 'body') continue;

			let value = null;
			if (typeof key === 'function') {
				let r = await key();
				key = r.key;
				value = r.value;
			} else {
				value = this.serialize_format(key, item[key]);
			}

			output.props.push(key + ': ' + value);
		}

		let temp = [];

		if (output.title) temp.push(output.title);
		if (output.body) temp.push(output.body);
		if (output.props.length) temp.push(output.props.join("\n"));

		return temp.join("\n\n");
	}

	static async serializeForSync(item) {
		const ItemClass = this.itemClass(item);
		let serialized = await ItemClass.serialize(item);
		if (!Setting.value('encryption.enabled') || !ItemClass.encryptionSupported()) return serialized;

		if (!BaseItem.encryptionService_) throw new Error('BaseItem.encryptionService_ is not set!!');

		const cipherText = await BaseItem.encryptionService_.encryptString(serialized);

		const reducedItem = Object.assign({}, item);
		const keepKeys = ['id', 'title', 'parent_id', 'body', 'updated_time', 'type_'];
		if ('title' in reducedItem) reducedItem.title = '';
		if ('body' in reducedItem) reducedItem.body = '';

		for (let n in reducedItem) {
			if (!reducedItem.hasOwnProperty(n)) continue;

			if (keepKeys.indexOf(n) >= 0) {
				continue;
			} else {
				delete reducedItem[n];
			}
		}

		reducedItem.encryption_cipher_text = cipherText;

		return ItemClass.serialize(reducedItem)
	}

	static async decrypt(item) {
		if (!item.encryption_cipher_text) throw new Error('Item is not encrypted: ' + item.id);

		const ItemClass = this.itemClass(item);
		const plainText = await BaseItem.encryptionService_.decryptString(item.encryption_cipher_text);

		// Note: decryption does not count has a change, so don't update any timestamp
		const plainItem = await ItemClass.unserialize(plainText);
		plainItem.updated_time = item.updated_time;
		plainItem.encryption_cipher_text = '';
		return ItemClass.save(plainItem, { autoTimestamp: false });
	}

	static async unserialize(content) {
		let lines = content.split("\n");
		let output = {};
		let state = 'readingProps';
		let body = [];

		for (let i = lines.length - 1; i >= 0; i--) {
			let line = lines[i];

			if (state == 'readingProps') {
				line = line.trim();

				if (line == '') {
					state = 'readingBody';
					continue;
				}

				let p = line.indexOf(':');
				if (p < 0) throw new Error('Invalid property format: ' + line + ": " + content);
				let key = line.substr(0, p).trim();
				let value = line.substr(p + 1).trim();
				output[key] = value;
			} else if (state == 'readingBody') {
				body.splice(0, 0, line);
			}
		}

		if (!output.type_) throw new Error('Missing required property: type_: ' + content);
		output.type_ = Number(output.type_);

		if (body.length) {
			let title = body.splice(0, 2);
			output.title = title[0];
		}

		if (output.type_ === BaseModel.TYPE_NOTE) output.body = body.join("\n");

		for (let n in output) {
			if (!output.hasOwnProperty(n)) continue;
			output[n] = await this.unserialize_format(output.type_, n, output[n]);
		}

		return output;
	}

	static async itemsThatNeedSync(syncTarget, limit = 100) {
		const classNames = this.syncItemClassNames();

		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);
			let fieldNames = ItemClass.fieldNames('items');			

			// // NEVER SYNCED:
			// 'SELECT * FROM [ITEMS] WHERE id NOT INT (SELECT item_id FROM sync_items WHERE sync_target = ?)'

			// // CHANGED:
			// 'SELECT * FROM [ITEMS] items JOIN sync_items s ON s.item_id = items.id WHERE sync_target = ? AND'

			let extraWhere = className == 'Note' ? 'AND is_conflict = 0' : '';

			// First get all the items that have never been synced under this sync target

			let sql = sprintf(`
				SELECT %s
				FROM %s items
				WHERE id NOT IN (
					SELECT item_id FROM sync_items WHERE sync_target = %d
				)
				%s
				LIMIT %d
			`,
			this.db().escapeFields(fieldNames),
			this.db().escapeField(ItemClass.tableName()),
			Number(syncTarget),
			extraWhere,
			limit);

			let neverSyncedItem = await ItemClass.modelSelectAll(sql);

			// Secondly get the items that have been synced under this sync target but that have been changed since then

			const newLimit = limit - neverSyncedItem.length;

			let changedItems = [];

			if (newLimit > 0) {
				fieldNames.push('sync_time');

				let sql = sprintf(`
					SELECT %s FROM %s items
					JOIN sync_items s ON s.item_id = items.id
					WHERE sync_target = %d
					AND s.sync_time < items.updated_time
					AND s.sync_disabled = 0
					%s
					LIMIT %d
				`,
				this.db().escapeFields(fieldNames),
				this.db().escapeField(ItemClass.tableName()),
				Number(syncTarget),
				extraWhere,
				newLimit);

				changedItems = await ItemClass.modelSelectAll(sql);
			}

			const items = neverSyncedItem.concat(changedItems);

			if (i >= classNames.length - 1) {
				return { hasMore: items.length >= limit, items: items };
			} else {
				if (items.length) return { hasMore: true, items: items };
			}
		}

		throw new Error('Unreachable');
	}

	static syncItemClassNames() {
		return BaseItem.syncItemDefinitions_.map((def) => {
			return def.className;
		});
	}

	static syncItemTypes() {
		return BaseItem.syncItemDefinitions_.map((def) => {
			return def.type;
		});
	}

	static modelTypeToClassName(type) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].type == type) return BaseItem.syncItemDefinitions_[i].className;
		}
		throw new Error('Invalid type: ' + type);
	}

	static async syncDisabledItems(syncTargetId) {
		const rows = await this.db().selectAll('SELECT * FROM sync_items WHERE sync_disabled = 1 AND sync_target = ?', [syncTargetId]);
		let output = [];
		for (let i = 0; i < rows.length; i++) {
			const item = await this.loadItem(rows[i].item_type, rows[i].item_id);
			if (!item) continue; // The referenced item no longer exist
			output.push({
				syncInfo: rows[i],
				item: item,
			});
		}
		return output;
	}

	static updateSyncTimeQueries(syncTarget, item, syncTime, syncDisabled = false, syncDisabledReason = '') {
		const itemType = item.type_;
		const itemId = item.id;
		if (!itemType || !itemId || syncTime === undefined) throw new Error('Invalid parameters in updateSyncTimeQueries()');

		return [
			{
				sql: 'DELETE FROM sync_items WHERE sync_target = ? AND item_type = ? AND item_id = ?',
				params: [syncTarget, itemType, itemId],
			},
			{
				sql: 'INSERT INTO sync_items (sync_target, item_type, item_id, sync_time, sync_disabled, sync_disabled_reason) VALUES (?, ?, ?, ?, ?, ?)',
				params: [syncTarget, itemType, itemId, syncTime, syncDisabled ? 1 : 0, syncDisabledReason + ''],
			}
		];
	}

	static async saveSyncTime(syncTarget, item, syncTime) {
		const queries = this.updateSyncTimeQueries(syncTarget, item, syncTime);
		return this.db().transactionExecBatch(queries);
	}

	static async saveSyncDisabled(syncTargetId, item, syncDisabledReason) {
		const syncTime = 'sync_time' in item ? item.sync_time : 0;
		const queries = this.updateSyncTimeQueries(syncTargetId, item, syncTime, true, syncDisabledReason);
		return this.db().transactionExecBatch(queries);
	}

	// When an item is deleted, its associated sync_items data is not immediately deleted for
	// performance reason. So this function is used to look for these remaining sync_items and
	// delete them.
	static async deleteOrphanSyncItems() {
		const classNames = this.syncItemClassNames();

		let queries = [];
		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);

			let selectSql = 'SELECT id FROM ' + ItemClass.tableName();
			if (ItemClass.modelType() == this.TYPE_NOTE) selectSql += ' WHERE is_conflict = 0';

			queries.push('DELETE FROM sync_items WHERE item_type = ' + ItemClass.modelType() + ' AND item_id NOT IN (' + selectSql + ')');
		}

		await this.db().transactionExecBatch(queries);
	}

}

BaseItem.encryptionService_ = null;

// Also update:
// - itemsThatNeedSync()
// - syncedItems()

BaseItem.syncItemDefinitions_ = [
	{ type: BaseModel.TYPE_NOTE, className: 'Note' },
	{ type: BaseModel.TYPE_FOLDER, className: 'Folder' },
	{ type: BaseModel.TYPE_RESOURCE, className: 'Resource' },
	{ type: BaseModel.TYPE_TAG, className: 'Tag' },
	{ type: BaseModel.TYPE_NOTE_TAG, className: 'NoteTag' },
	{ type: BaseModel.TYPE_MASTER_KEY, className: 'MasterKey' },
];

module.exports = { BaseItem };