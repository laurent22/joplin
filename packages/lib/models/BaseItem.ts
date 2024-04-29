import { ModelType, DeleteOptions } from '../BaseModel';
import { BaseItemEntity, DeletedItemEntity, NoteEntity, SyncItemEntity } from '../services/database/types';
import Setting from './Setting';
import BaseModel from '../BaseModel';
import time from '../time';
import markdownUtils from '../markdownUtils';
import { _ } from '../locale';
import Database from '../database';
import ItemChange from './ItemChange';
import ShareService from '../services/share/ShareService';
import itemCanBeEncrypted from './utils/itemCanBeEncrypted';
import { getEncryptionEnabled } from '../services/synchronizer/syncInfoUtils';
import JoplinError from '../JoplinError';
import { LoadOptions, SaveOptions } from './utils/types';
import { State as ShareState } from '../services/share/reducer';
import { checkIfItemCanBeAddedToFolder, checkIfItemCanBeChanged, checkIfItemsCanBeChanged, needsShareReadOnlyChecks } from './utils/readOnly';
import { checkObjectHasProperties } from '@joplin/utils/object';

const { sprintf } = require('sprintf-js');
const moment = require('moment');

export interface ItemsThatNeedDecryptionResult {
	hasMore: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	items: any[];
}

export interface ItemThatNeedSync {
	id: string;
	sync_time: number;
	type_: ModelType;
	updated_time: number;
	encryption_applied: number;
	share_id: string;
}

export interface ItemsThatNeedSyncResult {
	hasMore: boolean;
	items: ItemThatNeedSync[];
	neverSyncedItemIds: string[];
}

export interface EncryptedItemsStats {
	encrypted: number;
	total: number;
}

export default class BaseItem extends BaseModel {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static encryptionService_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static revisionService_: any = null;
	public static shareService_: ShareService = null;
	private static syncShareCache_: ShareState | null = null;

	// Also update:
	// - itemsThatNeedSync()
	// - syncedItems()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static syncItemDefinitions_: any[] = [
		{ type: BaseModel.TYPE_NOTE, className: 'Note' },
		{ type: BaseModel.TYPE_FOLDER, className: 'Folder' },
		{ type: BaseModel.TYPE_RESOURCE, className: 'Resource' },
		{ type: BaseModel.TYPE_TAG, className: 'Tag' },
		{ type: BaseModel.TYPE_NOTE_TAG, className: 'NoteTag' },
		{ type: BaseModel.TYPE_MASTER_KEY, className: 'MasterKey' },
		{ type: BaseModel.TYPE_REVISION, className: 'Revision' },
	];

	public static SYNC_ITEM_LOCATION_LOCAL = 1;
	public static SYNC_ITEM_LOCATION_REMOTE = 2;


	public static useUuid() {
		return true;
	}

	public static encryptionSupported() {
		return true;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static loadClass(className: string, classRef: any) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].className === className) {
				BaseItem.syncItemDefinitions_[i].classRef = classRef;
				return;
			}
		}

		throw new Error(`Invalid class name: ${className}`);
	}

	public static get syncShareCache(): ShareState {
		return this.syncShareCache_;
	}

	public static set syncShareCache(v: ShareState) {
		this.syncShareCache_ = v;
	}

	public static async findUniqueItemTitle(title: string, parentId: string = null) {
		let counter = 1;
		let titleToTry = title;
		while (true) {
			let item = null;

			if (parentId !== null) {
				item = await this.loadByFields({
					title: titleToTry,
					parent_id: parentId,
				});
			} else {
				item = await this.loadByField('title', titleToTry);
			}

			if (!item) return titleToTry;
			titleToTry = `${title} (${counter})`;
			counter++;
			if (counter >= 100) titleToTry = `${title} (${new Date().getTime()})`;
			if (counter >= 1000) throw new Error('Cannot find unique title');
		}
	}

	// Need to dynamically load the classes like this to avoid circular dependencies
	public static getClass(name: string) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].className === name) {
				const classRef = BaseItem.syncItemDefinitions_[i].classRef;
				if (!classRef) throw new Error(`Class has not been loaded: ${name}`);
				return BaseItem.syncItemDefinitions_[i].classRef;
			}
		}

		throw new Error(`Invalid class name: ${name}`);
	}

	public static getClassByItemType(itemType: ModelType) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].type === itemType) {
				return BaseItem.syncItemDefinitions_[i].classRef;
			}
		}

		throw new Error(`Invalid item type: ${itemType}`);
	}

	public static async syncedCount(syncTarget: number) {
		const ItemClass = this.itemClass(this.modelType());
		const itemType = ItemClass.modelType();
		// The fact that we don't check if the item_id still exist in the corresponding item table, means
		// that the returned number might be inaccurate (for example if a sync operation was cancelled)
		const sql = 'SELECT count(*) as total FROM sync_items WHERE sync_target = ? AND item_type = ?';
		const r = await this.db().selectOne(sql, [syncTarget, itemType]);
		return r.total;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static systemPath(itemOrId: any, extension: string = null) {
		if (extension === null) extension = 'md';

		if (typeof itemOrId === 'string') return `${itemOrId}.${extension}`;
		else return `${itemOrId.id}.${extension}`;
	}

	public static isSystemPath(path: string) {
		// 1b175bb38bba47baac22b0b47f778113.md
		if (!path || !path.length) return false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let p: any = path.split('/');
		p = p[p.length - 1];
		p = p.split('.');
		if (p.length !== 2) return false;
		return p[0].length === 32 && p[1] === 'md';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static itemClass(item: any): typeof BaseItem {
		if (!item) throw new Error('Item cannot be null');

		if (typeof item === 'object') {
			if (!('type_' in item)) throw new Error('Item does not have a type_ property');
			return this.itemClass(item.type_);
		} else {
			for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
				const d = BaseItem.syncItemDefinitions_[i];
				if (Number(item) === d.type) return this.getClass(d.className);
			}
			throw new JoplinError(`Unknown type: ${item}`, 'unknownItemType');
		}
	}

	// Returns the IDs of the items that have been synced at least once
	public static async syncedItemIds(syncTarget: number) {
		if (!syncTarget) throw new Error('No syncTarget specified');
		const temp = await this.db().selectAll('SELECT item_id FROM sync_items WHERE sync_time > 0 AND sync_target = ?', [syncTarget]);
		const output = [];
		for (let i = 0; i < temp.length; i++) {
			output.push(temp[i].item_id);
		}
		return output;
	}

	public static async syncItem(syncTarget: number, itemId: string, options: LoadOptions = null): Promise<SyncItemEntity> {
		options = {
			fields: '*',
			...options,
		};
		return await this.db().selectOne(`SELECT ${this.db().escapeFieldsToString(options.fields)} FROM sync_items WHERE sync_target = ? AND item_id = ?`, [syncTarget, itemId]);
	}

	public static async allSyncItems(syncTarget: number) {
		const output = await this.db().selectAll('SELECT * FROM sync_items WHERE sync_target = ?', [syncTarget]);
		return output;
	}

	public static pathToId(path: string): string {
		const p = path.split('/');
		const s = p[p.length - 1].split('.');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let name: any = s[0];
		if (!name) return name;
		name = name.split('-');
		return name[name.length - 1];
	}

	public static loadItemByPath(path: string) {
		return this.loadItemById(this.pathToId(path));
	}

	public static async loadItemById(id: string, options: LoadOptions = null) {
		const classes = this.syncItemClassNames();
		for (let i = 0; i < classes.length; i++) {
			const item = await this.getClass(classes[i]).load(id, options);
			if (item) return item;
		}
		return null;
	}

	public static async loadItemsByIds(ids: string[]) {
		if (!ids.length) return [];

		const classes = this.syncItemClassNames();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let output: any[] = [];
		for (let i = 0; i < classes.length; i++) {
			const ItemClass = this.getClass(classes[i]);
			const sql = `SELECT * FROM ${ItemClass.tableName()} WHERE id IN ("${ids.join('","')}")`;
			const models = await ItemClass.modelSelectAll(sql);
			output = output.concat(models);
		}
		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async loadItemsByTypeAndIds(itemType: ModelType, ids: string[], options: LoadOptions = null): Promise<any[]> {
		if (!ids.length) return [];

		const fields = options && options.fields ? options.fields : [];
		const ItemClass = this.getClassByItemType(itemType);
		const fieldsSql = fields.length ? this.db().escapeFields(fields) : '*';
		const sql = `SELECT ${fieldsSql} FROM ${ItemClass.tableName()} WHERE id IN ("${ids.join('","')}")`;
		return ItemClass.modelSelectAll(sql);
	}

	public static async loadItemByTypeAndId(itemType: ModelType, id: string, options: LoadOptions = null) {
		const result = await this.loadItemsByTypeAndIds(itemType, [id], options);
		return result.length ? result[0] : null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static loadItemByField(itemType: number, field: string, value: any) {
		const ItemClass = this.itemClass(itemType);
		return ItemClass.loadByField(field, value);
	}

	public static loadItem(itemType: ModelType, id: string, options: LoadOptions = null) {
		if (!options) options = {};
		const ItemClass = this.itemClass(itemType);
		return ItemClass.load(id, options);
	}

	public static deleteItem(itemType: ModelType, id: string, options: DeleteOptions) {
		const ItemClass = this.itemClass(itemType);
		return ItemClass.delete(id, options);
	}

	public static async delete(id: string, options?: DeleteOptions) {
		return this.batchDelete([id], options);
	}

	public static async batchDelete(ids: string[], options: DeleteOptions) {
		if (!options) options = { sourceDescription: '' };
		let trackDeleted = true;
		if (options && options.trackDeleted !== null && options.trackDeleted !== undefined) trackDeleted = options.trackDeleted;

		// Don't create a deleted_items entry when conflicted notes are deleted
		// since no other client have (or should have) them.
		let conflictNoteIds: string[] = [];
		if (this.modelType() === BaseModel.TYPE_NOTE) {
			const conflictNotes = await this.db().selectAll(`SELECT id FROM notes WHERE id IN ("${ids.join('","')}") AND is_conflict = 1`);
			conflictNoteIds = conflictNotes.map((n: NoteEntity) => {
				return n.id;
			});
		}

		if (needsShareReadOnlyChecks(this.modelType(), options.changeSource, this.syncShareCache, options.disableReadOnlyCheck)) {
			const previousItems = await this.loadItemsByTypeAndIds(this.modelType(), ids, { fields: ['share_id', 'id'] });
			checkIfItemsCanBeChanged(this.modelType(), options.changeSource, previousItems, this.syncShareCache);
		}

		await super.batchDelete(ids, options);

		if (trackDeleted) {
			const syncTargetIds = Setting.enumOptionValues('sync.target');
			const queries = [];
			const now = time.unixMs();
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

	// Note: Currently, once a deleted_items entry has been processed, it is removed from the database. In practice it means that
	// the following case will not work as expected:
	// - Client 1 creates a note and sync with target 1 and 2
	// - Client 2 sync with target 1
	// - Client 2 deletes note and sync with target 1
	// - Client 1 syncs with target 1 only (note is deleted from local machine, as expected)
	// - Client 1 syncs with target 2 only => the note is *not* deleted from target 2 because no information
	//   that it was previously deleted exist (deleted_items entry has been deleted).
	// The solution would be to permanently store the list of deleted items on each client.
	public static deletedItems(syncTarget: number): Promise<DeletedItemEntity[]> {
		return this.db().selectAll('SELECT * FROM deleted_items WHERE sync_target = ?', [syncTarget]);
	}

	public static async deletedItemCount(syncTarget: number) {
		const r = await this.db().selectOne('SELECT count(*) as total FROM deleted_items WHERE sync_target = ?', [syncTarget]);
		return r['total'];
	}

	public static async allItemsInTrash() {
		const noteRows = await this.db().selectAll('SELECT id FROM notes WHERE deleted_time != 0');
		const folderRows = await this.db().selectAll('SELECT id FROM folders WHERE deleted_time != 0');
		return {
			noteIds: noteRows.map(r => r.id),
			folderIds: folderRows.map(r => r.id),
		};
	}

	public static remoteDeletedItem(syncTarget: number, itemId: string) {
		return this.db().exec('DELETE FROM deleted_items WHERE item_id = ? AND sync_target = ?', [itemId, syncTarget]);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static serialize_format(propName: string, propValue: any) {
		if (['created_time', 'updated_time', 'sync_time', 'user_updated_time', 'user_created_time'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = `${moment.unix(propValue / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`;
		} else if (['title_diff', 'body_diff'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = JSON.stringify(propValue);
		} else if (propValue === null || propValue === undefined) {
			propValue = '';
		} else {
			propValue = `${propValue}`;
		}

		if (propName === 'body') return propValue;

		return propValue
			.replace(/\\n/g, '\\\\n')
			.replace(/\\r/g, '\\\\r')
			.replace(/\n/g, '\\n')
			.replace(/\r/g, '\\r');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static unserialize_format(type: ModelType, propName: string, propValue: any) {
		if (propName[propName.length - 1] === '_') return propValue; // Private property

		const ItemClass = this.itemClass(type);

		if (['title_diff', 'body_diff'].indexOf(propName) >= 0) {
			if (!propValue) return '';
			propValue = JSON.parse(propValue);
		} else if (['longitude', 'latitude', 'altitude'].indexOf(propName) >= 0) {
			const places = (propName === 'altitude') ? 4 : 8;
			propValue = Number(propValue).toFixed(places);
		} else {
			if (['created_time', 'updated_time', 'user_created_time', 'user_updated_time'].indexOf(propName) >= 0) {
				propValue = (!propValue) ? '0' : moment(propValue, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x');
			}
			propValue = Database.formatValue(ItemClass.fieldType(propName), propValue);
		}

		if (propName === 'body') return propValue;

		return typeof propValue === 'string' ? propValue
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '\r')
			.replace(/\\\n/g, '\\n')
			.replace(/\\\r/g, '\\r')
			: propValue;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async serialize(item: any, shownKeys: any[] = null) {
		if (shownKeys === null) {
			shownKeys = this.itemClass(item).fieldNames();
			shownKeys.push('type_');
		}

		item = this.filter(item);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const output: any = {};

		if ('title' in item && shownKeys.indexOf('title') >= 0) {
			output.title = item.title;
		}

		if ('body' in item && shownKeys.indexOf('body') >= 0) {
			output.body = item.body;
		}

		output.props = [];

		for (let i = 0; i < shownKeys.length; i++) {
			let key = shownKeys[i];
			if (key === 'title' || key === 'body') continue;

			let value = null;
			if (typeof key === 'function') {
				const r = await key();
				key = r.key;
				value = r.value;
			} else {
				value = this.serialize_format(key, item[key]);
			}

			output.props.push(`${key}: ${value}`);
		}

		const temp = [];

		if (typeof output.title === 'string') temp.push(output.title);
		if (output.body) temp.push(output.body);
		if (output.props.length) temp.push(output.props.join('\n'));

		return temp.join('\n\n');
	}

	public static encryptionService() {
		if (!this.encryptionService_) throw new Error('BaseItem.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	public static revisionService() {
		if (!this.revisionService_) throw new Error('BaseItem.revisionService_ is not set!!');
		return this.revisionService_;
	}

	protected static shareService() {
		if (!this.shareService_) throw new Error('BaseItem.shareService_ is not set!!');
		return this.shareService_;
	}

	public static async serializeForSync(item: BaseItemEntity): Promise<string> {
		const ItemClass = this.itemClass(item);
		const shownKeys = ItemClass.fieldNames();
		shownKeys.push('type_');

		const share = item.share_id ? await this.shareService().shareById(item.share_id) : null;
		const serialized = await ItemClass.serialize(item, shownKeys);

		if (!getEncryptionEnabled() || !ItemClass.encryptionSupported() || !itemCanBeEncrypted(item, share)) {
			// Normally not possible since itemsThatNeedSync should only return decrypted items
			if (item.encryption_applied) throw new JoplinError('Item is encrypted but encryption is currently disabled', 'cannotSyncEncrypted');
			return serialized;
		}

		if (item.encryption_applied) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const e: any = new Error('Trying to encrypt item that is already encrypted');
			e.code = 'cannotEncryptEncrypted';
			throw e;
		}

		let cipherText = null;

		try {
			cipherText = await this.encryptionService().encryptString(serialized, {
				masterKeyId: share && share.master_key_id ? share.master_key_id : '',
			});
		} catch (error) {
			const msg = [`Could not encrypt item ${item.id}`];
			if (error && error.message) msg.push(error.message);
			const newError = new Error(msg.join(': '));
			newError.stack = error.stack;
			throw newError;
		}

		// List of keys that won't be encrypted - mostly foreign keys required to link items
		// with each others and timestamp required for synchronisation.
		const keepKeys = ['id', 'note_id', 'tag_id', 'parent_id', 'share_id', 'updated_time', 'deleted_time', 'type_'];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const reducedItem: any = {};

		for (let i = 0; i < keepKeys.length; i++) {
			const n = keepKeys[i];
			if (!item.hasOwnProperty(n)) continue;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			reducedItem[n] = (item as any)[n];
		}

		reducedItem.encryption_applied = 1;
		reducedItem.encryption_cipher_text = cipherText;
		return ItemClass.serialize(reducedItem);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async decrypt(item: any) {
		if (!item.encryption_cipher_text) throw new Error(`Item is not encrypted: ${item.id}`);

		const ItemClass = this.itemClass(item);
		const plainText = await this.encryptionService().decryptString(item.encryption_cipher_text);

		// Note: decryption does not count has a change, so don't update any timestamp
		const plainItem = await ItemClass.unserialize(plainText);
		plainItem.updated_time = item.updated_time;
		plainItem.encryption_cipher_text = '';
		plainItem.encryption_applied = 0;
		return ItemClass.save(plainItem, { autoTimestamp: false, changeSource: ItemChange.SOURCE_DECRYPTION });
	}

	public static async unserialize(content: string) {
		const lines = content.split('\n');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let output: any = {};
		let state = 'readingProps';
		const body: string[] = [];

		for (let i = lines.length - 1; i >= 0; i--) {
			let line = lines[i];

			if (state === 'readingProps') {
				line = line.trim();

				if (line === '') {
					state = 'readingBody';
					continue;
				}

				const p = line.indexOf(':');
				if (p < 0) throw new Error(`Invalid property format: ${line}: ${content}`);
				const key = line.substr(0, p).trim();
				const value = line.substr(p + 1).trim();
				output[key] = value;
			} else if (state === 'readingBody') {
				body.splice(0, 0, line);
			}
		}

		if (!output.type_) throw new Error(`Missing required property: type_: ${content}`);
		output.type_ = Number(output.type_);

		if (body.length) {
			const title = body.splice(0, 2);
			output.title = title[0];
		}

		if (output.type_ === BaseModel.TYPE_NOTE) output.body = body.join('\n');

		const ItemClass = this.itemClass(output.type_);
		output = ItemClass.removeUnknownFields(output);

		for (const n in output) {
			if (!output.hasOwnProperty(n)) continue;
			output[n] = await this.unserialize_format(output.type_, n, output[n]);
		}

		return output;
	}

	public static async encryptedItemsStats(): Promise<EncryptedItemsStats> {
		const classNames = this.encryptableItemClassNames();
		let encryptedCount = 0;
		let totalCount = 0;

		for (let i = 0; i < classNames.length; i++) {
			const ItemClass = this.getClass(classNames[i]);
			encryptedCount += await ItemClass.count({ where: 'encryption_applied = 1' });
			totalCount += await ItemClass.count();
		}

		return {
			encrypted: encryptedCount,
			total: totalCount,
		};
	}

	public static async encryptedItemsCount() {
		const classNames = this.encryptableItemClassNames();
		let output = 0;

		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);
			const count = await ItemClass.count({ where: 'encryption_applied = 1' });
			output += count;
		}

		return output;
	}

	public static async hasEncryptedItems() {
		const classNames = this.encryptableItemClassNames();

		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);

			const count = await ItemClass.count({ where: 'encryption_applied = 1' });
			if (count) return true;
		}

		return false;
	}

	public static async itemsThatNeedDecryption(exclusions: string[] = [], limit = 100): Promise<ItemsThatNeedDecryptionResult> {
		const classNames = this.encryptableItemClassNames();

		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);

			let whereSql = ['encryption_applied = 1'];

			if (className === 'Resource') {
				const blobDownloadedButEncryptedSql = 'encryption_blob_encrypted = 1 AND id IN (SELECT resource_id FROM resource_local_states WHERE fetch_status = 2))';
				whereSql = [`(encryption_applied = 1 OR (${blobDownloadedButEncryptedSql})`];
			}

			if (exclusions.length) whereSql.push(`id NOT IN ("${exclusions.join('","')}")`);

			const sql = sprintf(
				`
				SELECT *
				FROM %s
				WHERE %s
				LIMIT %d
				`,
				this.db().escapeField(ItemClass.tableName()),
				whereSql.join(' AND '),
				limit,
			);

			const items = await ItemClass.modelSelectAll(sql);

			if (i >= classNames.length - 1) {
				return { hasMore: items.length >= limit, items: items };
			} else {
				if (items.length) return { hasMore: true, items: items };
			}
		}

		throw new Error('Unreachable');
	}

	public static async itemHasBeenSynced(itemId: string): Promise<boolean> {
		const r = await this.db().selectOne('SELECT item_id FROM sync_items WHERE item_id = ?', [itemId]);
		return !!r;
	}

	public static async itemsThatNeedSync(syncTarget: number, limit = 100): Promise<ItemsThatNeedSyncResult> {
		// Although we keep the master keys in the database, we no longer sync them
		const classNames = this.syncItemClassNames().filter(n => n !== 'MasterKey');

		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);
			const fieldNames = ItemClass.fieldNames('items');

			// // NEVER SYNCED:
			// 'SELECT * FROM [ITEMS] WHERE id NOT INT (SELECT item_id FROM sync_items WHERE sync_target = ?)'

			// // CHANGED:
			// 'SELECT * FROM [ITEMS] items JOIN sync_items s ON s.item_id = items.id WHERE sync_target = ? AND'

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let extraWhere: any = [];
			if (className === 'Note') extraWhere.push('is_conflict = 0');
			if (className === 'Resource') extraWhere.push('encryption_blob_encrypted = 0');
			if (ItemClass.encryptionSupported()) extraWhere.push('encryption_applied = 0');

			extraWhere = extraWhere.length ? `AND ${extraWhere.join(' AND ')}` : '';

			// First get all the items that have never been synced under this sync target
			//
			// We order them by date descending so that latest modified notes go first.
			// In most case it doesn't make a big difference, but when re-syncing the whole
			// data set it does. In that case it means the recent notes, those that are likely
			// to be modified again, will be synced first, thus avoiding potential conflicts.

			const sql = sprintf(`
				SELECT %s
				FROM %s items
				WHERE id NOT IN (
					SELECT item_id FROM sync_items WHERE sync_target = %d
				)
				%s
				ORDER BY items.updated_time DESC
				LIMIT %d
			`,
			this.db().escapeFields(fieldNames),
			this.db().escapeField(ItemClass.tableName()),
			Number(syncTarget),
			extraWhere,
			limit,
			);

			const neverSyncedItem = await ItemClass.modelSelectAll(sql);

			// Secondly get the items that have been synced under this sync target but that have been changed since then

			const newLimit = limit - neverSyncedItem.length;

			let changedItems = [];

			if (newLimit > 0) {
				fieldNames.push('sync_time');

				const sql = sprintf(
					`
					SELECT %s FROM %s items
					JOIN sync_items s ON s.item_id = items.id
					WHERE sync_target = %d
					AND (s.sync_time < items.updated_time OR force_sync = 1)
					AND s.sync_disabled = 0
					%s
					ORDER BY items.updated_time DESC
					LIMIT %d
				`,
					this.db().escapeFields(fieldNames),
					this.db().escapeField(ItemClass.tableName()),
					Number(syncTarget),
					extraWhere,
					newLimit,
				);

				changedItems = await ItemClass.modelSelectAll(sql);
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const neverSyncedItemIds = neverSyncedItem.map((it: any) => it.id);
			const items = neverSyncedItem.concat(changedItems);

			if (i >= classNames.length - 1) {
				return { hasMore: items.length >= limit, items: items, neverSyncedItemIds };
			} else {
				if (items.length) return { hasMore: true, items: items, neverSyncedItemIds };
			}
		}

		throw new Error('Unreachable');
	}

	public static syncItemClassNames(): string[] {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return BaseItem.syncItemDefinitions_.map((def: any) => {
			return def.className;
		});
	}

	public static encryptableItemClassNames() {
		const temp = this.syncItemClassNames();
		const output = [];
		for (let i = 0; i < temp.length; i++) {
			if (temp[i] === 'MasterKey') continue;
			output.push(temp[i]);
		}
		return output;
	}

	public static syncItemTypes(): ModelType[] {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		return BaseItem.syncItemDefinitions_.map((def: any) => {
			return def.type;
		});
	}

	public static modelTypeToClassName(type: number) {
		for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
			if (BaseItem.syncItemDefinitions_[i].type === type) return BaseItem.syncItemDefinitions_[i].className;
		}
		throw new Error(`Invalid type: ${type}`);
	}

	public static async syncDisabledItems(syncTargetId: number) {
		const rows = await this.db().selectAll('SELECT * FROM sync_items WHERE sync_disabled = 1 AND sync_target = ?', [syncTargetId]);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const item = await this.loadItem(row.item_type, row.item_id);
			if (row.item_location === BaseItem.SYNC_ITEM_LOCATION_LOCAL && !item) continue; // The referenced item no longer exist

			output.push({
				syncInfo: row,
				location: row.item_location,
				item: item,
				warning_ignored: row.sync_warning_ignored,
			});
		}
		return output;
	}

	public static async syncDisabledItemsCount(syncTargetId: number, includeIgnored = false) {
		const whereQueries = ['sync_disabled = 1', 'sync_target = ?'];
		const whereArgs = [syncTargetId];
		if (!includeIgnored) {
			whereQueries.push('sync_warning_ignored = 0');
		}
		const r = await this.db().selectOne(`SELECT count(*) as total FROM sync_items WHERE ${whereQueries.join(' AND ')}`, whereArgs);
		return r ? r.total : 0;
	}

	public static async syncDisabledItemsCountIncludingIgnored(syncTargetId: number) {
		return this.syncDisabledItemsCount(syncTargetId, true);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static updateSyncTimeQueries(syncTarget: number, item: any, syncTime: number, syncDisabled = false, syncDisabledReason = '', itemLocation: number = null) {
		const itemType = item.type_;
		const itemId = item.id;
		if (!itemType || !itemId || syncTime === undefined) throw new Error(sprintf('Invalid parameters in updateSyncTimeQueries(): %d, %s, %d', syncTarget, JSON.stringify(item), syncTime));

		if (itemLocation === null) itemLocation = BaseItem.SYNC_ITEM_LOCATION_LOCAL;

		return [
			{
				sql: 'DELETE FROM sync_items WHERE sync_target = ? AND item_type = ? AND item_id = ?',
				params: [syncTarget, itemType, itemId],
			},
			{
				sql: 'INSERT INTO sync_items (sync_target, item_type, item_id, item_location, sync_time, sync_disabled, sync_disabled_reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
				params: [syncTarget, itemType, itemId, itemLocation, syncTime, syncDisabled ? 1 : 0, `${syncDisabledReason}`],
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async saveSyncTime(syncTarget: number, item: any, syncTime: number) {
		const queries = this.updateSyncTimeQueries(syncTarget, item, syncTime);
		return this.db().transactionExecBatch(queries);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async saveSyncDisabled(syncTargetId: number, item: any, syncDisabledReason: string, itemLocation: number = null) {
		const syncTime = 'sync_time' in item ? item.sync_time : 0;
		const queries = this.updateSyncTimeQueries(syncTargetId, item, syncTime, true, syncDisabledReason, itemLocation);
		return this.db().transactionExecBatch(queries);
	}

	public static async saveSyncEnabled(itemType: ModelType, itemId: string) {
		await this.db().exec('DELETE FROM sync_items WHERE item_type = ? AND item_id = ?', [itemType, itemId]);
	}

	public static async ignoreItemSyncWarning(syncTarget: number, item: { type_?: number; id?: string }) {
		checkObjectHasProperties(item, ['type_', 'id']);
		const itemType = item.type_;
		const itemId = item.id;
		const sql = 'UPDATE sync_items SET sync_warning_ignored = ? WHERE item_id = ? AND item_type = ? AND sync_target = ?';
		const params = [1, itemId, itemType, syncTarget];
		await this.db().exec(sql, params);
	}

	// When an item is deleted, its associated sync_items data is not immediately deleted for
	// performance reason. So this function is used to look for these remaining sync_items and
	// delete them.
	public static async deleteOrphanSyncItems() {
		const classNames = this.syncItemClassNames();

		const queries = [];
		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);

			let selectSql = `SELECT id FROM ${ItemClass.tableName()}`;
			if (ItemClass.modelType() === this.TYPE_NOTE) selectSql += ' WHERE is_conflict = 0';

			queries.push(`DELETE FROM sync_items WHERE item_location = ${BaseItem.SYNC_ITEM_LOCATION_LOCAL} AND item_type = ${ItemClass.modelType()} AND item_id NOT IN (${selectSql})`);
		}

		await this.db().transactionExecBatch(queries);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static displayTitle(item: any) {
		if (!item) return '';
		if (item.encryption_applied) return `🔑 ${_('Encrypted')}`;
		return item.title ? item.title : _('Untitled');
	}

	public static async markAllNonEncryptedForSync() {
		const classNames = this.encryptableItemClassNames();

		for (let i = 0; i < classNames.length; i++) {
			const className = classNames[i];
			const ItemClass = this.getClass(className);

			const sql = sprintf(
				`
				SELECT id
				FROM %s
				WHERE encryption_applied = 0`,
				this.db().escapeField(ItemClass.tableName()),
			);

			const items = await ItemClass.modelSelectAll(sql);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const ids = items.map((item: any) => {
				return item.id;
			});
			if (!ids.length) continue;

			await this.db().exec(`UPDATE sync_items SET force_sync = 1 WHERE item_id IN ("${ids.join('","')}")`);
		}
	}

	public static async updateShareStatus(item: BaseItemEntity, isShared: boolean) {
		if (!item.id || !item.type_) throw new Error('Item must have an ID and a type');
		if (!!item.is_shared === !!isShared) return false;
		const ItemClass = this.getClassByItemType(item.type_);

		// No auto-timestamp because sharing a note is not seen as an update
		await ItemClass.save({
			id: item.id,
			is_shared: isShared ? 1 : 0,
			updated_time: Date.now(),
		}, { autoTimestamp: false });

		// The timestamps have not been changed but still need the note to be synced
		// so we force-sync it.
		// await this.forceSync(item.id);

		return true;
	}

	public static async forceSync(itemId: string) {
		await this.db().exec('UPDATE sync_items SET force_sync = 1 WHERE item_id = ?', [itemId]);
	}

	public static async forceSyncAll() {
		await this.db().exec('UPDATE sync_items SET force_sync = 1');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async save(o: any, options: SaveOptions = null) {
		if (!options) options = {};

		if (options.userSideValidation === true) {
			if (o.encryption_applied) throw new Error(_('Encrypted items cannot be modified'));
		}

		const isNew = this.isNew(o, options);

		if (needsShareReadOnlyChecks(this.modelType(), options.changeSource, this.syncShareCache)) {
			if (!isNew) {
				const previousItem = await this.loadItemByTypeAndId(this.modelType(), o.id, { fields: ['id', 'share_id'] });
				checkIfItemCanBeChanged(this.modelType(), options.changeSource, previousItem, this.syncShareCache);
			}

			// If the item has a parent folder (a note or a sub-folder), check
			// that we're not adding the item to a read-only folder.
			if (o.parent_id) {
				await checkIfItemCanBeAddedToFolder(
					this.modelType(),
					this.getClass('Folder'),
					options.changeSource,
					BaseItem.syncShareCache,
					o.parent_id,
				);
			}
		}

		return super.save(o, options);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static markdownTag(itemOrId: any) {
		const item = typeof itemOrId === 'object' ? itemOrId : {
			id: itemOrId,
			title: '',
		};

		const output = [];
		output.push('[');
		output.push(markdownUtils.escapeTitleText(item.title));
		output.push(']');
		output.push(`(:/${item.id})`);
		return output.join('');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static isMarkdownTag(md: any) {
		if (!md) return false;
		return !!md.match(/^\[.*?\]\(:\/[0-9a-zA-Z]{32}\)$/);
	}

}
