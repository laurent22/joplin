"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("./Setting");
const BaseModel_1 = require("../BaseModel");
const time_1 = require("../time");
const markdownUtils_1 = require("../markdownUtils");
const locale_1 = require("../locale");
const database_1 = require("../database");
const ItemChange_1 = require("./ItemChange");
const itemCanBeEncrypted_1 = require("./utils/itemCanBeEncrypted");
const syncInfoUtils_1 = require("../services/synchronizer/syncInfoUtils");
const JoplinError_1 = require("../JoplinError");
const readOnly_1 = require("./utils/readOnly");
const object_1 = require("@joplin/utils/object");
const { sprintf } = require('sprintf-js');
const moment = require('moment');
class BaseItem extends BaseModel_1.default {
    static useUuid() {
        return true;
    }
    static encryptionSupported() {
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static loadClass(className, classRef) {
        for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
            if (BaseItem.syncItemDefinitions_[i].className === className) {
                BaseItem.syncItemDefinitions_[i].classRef = classRef;
                return;
            }
        }
        throw new Error(`Invalid class name: ${className}`);
    }
    static get syncShareCache() {
        return this.syncShareCache_;
    }
    static set syncShareCache(v) {
        this.syncShareCache_ = v;
    }
    static async findUniqueItemTitle(title, parentId = null) {
        let counter = 1;
        let titleToTry = title;
        while (true) {
            let item = null;
            if (parentId !== null) {
                item = await this.loadByFields({
                    title: titleToTry,
                    parent_id: parentId,
                });
            }
            else {
                item = await this.loadByField('title', titleToTry);
            }
            if (!item)
                return titleToTry;
            titleToTry = `${title} (${counter})`;
            counter++;
            if (counter >= 100)
                titleToTry = `${title} (${new Date().getTime()})`;
            if (counter >= 1000)
                throw new Error('Cannot find unique title');
        }
    }
    // Need to dynamically load the classes like this to avoid circular dependencies
    static getClass(name) {
        for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
            if (BaseItem.syncItemDefinitions_[i].className === name) {
                const classRef = BaseItem.syncItemDefinitions_[i].classRef;
                if (!classRef)
                    throw new Error(`Class has not been loaded: ${name}`);
                return BaseItem.syncItemDefinitions_[i].classRef;
            }
        }
        throw new Error(`Invalid class name: ${name}`);
    }
    static getClassByItemType(itemType) {
        for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
            if (BaseItem.syncItemDefinitions_[i].type === itemType) {
                return BaseItem.syncItemDefinitions_[i].classRef;
            }
        }
        throw new Error(`Invalid item type: ${itemType}`);
    }
    static async syncedCount(syncTarget) {
        const ItemClass = this.itemClass(this.modelType());
        const itemType = ItemClass.modelType();
        // The fact that we don't check if the item_id still exist in the corresponding item table, means
        // that the returned number might be inaccurate (for example if a sync operation was cancelled)
        const sql = 'SELECT count(*) as total FROM sync_items WHERE sync_target = ? AND item_type = ?';
        const r = await this.db().selectOne(sql, [syncTarget, itemType]);
        return r.total;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static systemPath(itemOrId, extension = null) {
        if (extension === null)
            extension = 'md';
        if (typeof itemOrId === 'string')
            return `${itemOrId}.${extension}`;
        else
            return `${itemOrId.id}.${extension}`;
    }
    static isSystemPath(path) {
        // 1b175bb38bba47baac22b0b47f778113.md
        if (!path || !path.length)
            return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let p = path.split('/');
        p = p[p.length - 1];
        p = p.split('.');
        if (p.length !== 2)
            return false;
        return p[0].length === 32 && p[1] === 'md';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static itemClass(item) {
        if (!item)
            throw new Error('Item cannot be null');
        if (typeof item === 'object') {
            if (!('type_' in item))
                throw new Error('Item does not have a type_ property');
            return this.itemClass(item.type_);
        }
        else {
            for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
                const d = BaseItem.syncItemDefinitions_[i];
                if (Number(item) === d.type)
                    return this.getClass(d.className);
            }
            throw new JoplinError_1.default(`Unknown type: ${item}`, 'unknownItemType');
        }
    }
    // Returns the IDs of the items that have been synced at least once
    static async syncedItemIds(syncTarget) {
        if (!syncTarget)
            throw new Error('No syncTarget specified');
        const temp = await this.db().selectAll('SELECT item_id FROM sync_items WHERE sync_time > 0 AND sync_target = ?', [syncTarget]);
        const output = [];
        for (let i = 0; i < temp.length; i++) {
            output.push(temp[i].item_id);
        }
        return output;
    }
    static async remoteItemMetadata(syncTarget) {
        if (!syncTarget)
            throw new Error('No syncTarget specified');
        const temp = await this.db().selectAll('SELECT item_id, remote_item_updated_time FROM sync_items WHERE sync_time > 0 AND sync_target = ?', [syncTarget]);
        const output = new Map();
        for (let i = 0; i < temp.length; i++) {
            const metadata = {
                item_id: temp[i].item_id,
                updated_time: temp[i].remote_item_updated_time,
            };
            output.set(temp[i].item_id, metadata);
        }
        return output;
    }
    static async syncItem(syncTarget, itemId, options = null) {
        options = Object.assign({ fields: '*' }, options);
        return await this.db().selectOne(`SELECT ${this.db().escapeFieldsToString(options.fields)} FROM sync_items WHERE sync_target = ? AND item_id = ?`, [syncTarget, itemId]);
    }
    static async allSyncItems(syncTarget) {
        const output = await this.db().selectAll('SELECT * FROM sync_items WHERE sync_target = ?', [syncTarget]);
        return output;
    }
    static pathToId(path) {
        const p = path.split('/');
        const s = p[p.length - 1].split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let name = s[0];
        if (!name)
            return name;
        name = name.split('-');
        return name[name.length - 1];
    }
    static loadItemByPath(path) {
        return this.loadItemById(this.pathToId(path));
    }
    static async loadItemById(id, options = null) {
        const classes = this.syncItemClassNames();
        for (let i = 0; i < classes.length; i++) {
            const item = await this.getClass(classes[i]).load(id, options);
            if (item)
                return item;
        }
        return null;
    }
    static async loadItemsByIds(ids) {
        if (!ids.length)
            return [];
        const classes = this.syncItemClassNames();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let output = [];
        for (let i = 0; i < classes.length; i++) {
            const ItemClass = this.getClass(classes[i]);
            const sql = `SELECT * FROM ${ItemClass.tableName()} WHERE id IN (${this.escapeIdsForSql(ids)})`;
            const models = await ItemClass.modelSelectAll(sql);
            output = output.concat(models);
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async loadItemsByTypeAndIds(itemType, ids, options = null) {
        if (!ids.length)
            return [];
        const fields = options && options.fields ? options.fields : [];
        const ItemClass = this.getClassByItemType(itemType);
        const fieldsSql = fields.length ? this.db().escapeFields(fields) : '*';
        const sql = `SELECT ${fieldsSql} FROM ${ItemClass.tableName()} WHERE id IN (${this.escapeIdsForSql(ids)})`;
        return ItemClass.modelSelectAll(sql);
    }
    static async loadItemByTypeAndId(itemType, id, options = null) {
        const result = await this.loadItemsByTypeAndIds(itemType, [id], options);
        return result.length ? result[0] : null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static loadItemByField(itemType, field, value) {
        const ItemClass = this.itemClass(itemType);
        return ItemClass.loadByField(field, value);
    }
    static loadItem(itemType, id, options = null) {
        if (!options)
            options = {};
        const ItemClass = this.itemClass(itemType);
        return ItemClass.load(id, options);
    }
    static deleteItem(itemType, id, options) {
        const ItemClass = this.itemClass(itemType);
        return ItemClass.delete(id, options);
    }
    static async delete(id, options) {
        return this.batchDelete([id], options);
    }
    static async batchDelete(ids, options) {
        if (!options)
            options = { sourceDescription: '' };
        let trackDeleted = true;
        if (options && options.trackDeleted !== null && options.trackDeleted !== undefined)
            trackDeleted = options.trackDeleted;
        // Don't create a deleted_items entry when conflicted notes are deleted
        // since no other client have (or should have) them.
        let conflictNoteIds = [];
        if (this.modelType() === BaseModel_1.default.TYPE_NOTE) {
            const conflictNotes = await this.db().selectAll(`SELECT id FROM notes WHERE id IN (${this.escapeIdsForSql(ids)}) AND is_conflict = 1`);
            conflictNoteIds = conflictNotes.map((n) => {
                return n.id;
            });
        }
        if ((0, readOnly_1.needsShareReadOnlyChecks)(this.modelType(), options.changeSource, this.syncShareCache, options.disableReadOnlyCheck)) {
            const previousItems = await this.loadItemsByTypeAndIds(this.modelType(), ids, { fields: ['share_id', 'id'] });
            (0, readOnly_1.checkIfItemsCanBeChanged)(this.modelType(), options.changeSource, previousItems, this.syncShareCache);
        }
        await super.batchDelete(ids, options);
        if (trackDeleted) {
            const syncTargetIds = Setting_1.default.enumOptionValues('sync.target');
            const queries = [];
            const now = time_1.default.unixMs();
            for (let i = 0; i < ids.length; i++) {
                if (conflictNoteIds.indexOf(ids[i]) >= 0)
                    continue;
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
    static deletedItems(syncTarget) {
        return this.db().selectAll('SELECT * FROM deleted_items WHERE sync_target = ?', [syncTarget]);
    }
    static async deletedItemCount(syncTarget) {
        const r = await this.db().selectOne('SELECT count(*) as total FROM deleted_items WHERE sync_target = ?', [syncTarget]);
        return r['total'];
    }
    static async allItemsInTrash() {
        const noteRows = await this.db().selectAll('SELECT id FROM notes WHERE deleted_time != 0');
        const folderRows = await this.db().selectAll('SELECT id FROM folders WHERE deleted_time != 0');
        return {
            noteIds: noteRows.map(r => r.id),
            folderIds: folderRows.map(r => r.id),
        };
    }
    static remoteDeletedItem(syncTarget, itemId) {
        return this.db().exec('DELETE FROM deleted_items WHERE item_id = ? AND sync_target = ?', [itemId, syncTarget]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static serialize_format(propName, propValue) {
        if (['created_time', 'updated_time', 'sync_time', 'user_updated_time', 'user_created_time'].indexOf(propName) >= 0) {
            if (!propValue)
                return '';
            propValue = `${moment.unix(propValue / 1000).utc().format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`;
        }
        else if (['title_diff', 'body_diff'].indexOf(propName) >= 0) {
            if (!propValue)
                return '';
            propValue = JSON.stringify(propValue);
        }
        else if (propValue === null || propValue === undefined) {
            propValue = '';
        }
        else {
            propValue = `${propValue}`;
        }
        if (propName === 'body')
            return propValue;
        return propValue
            .replace(/\\n/g, '\\\\n')
            .replace(/\\r/g, '\\\\r')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static unserialize_format(type, propName, propValue) {
        if (propName[propName.length - 1] === '_')
            return propValue; // Private property
        const ItemClass = this.itemClass(type);
        if (['title_diff', 'body_diff'].indexOf(propName) >= 0) {
            if (!propValue)
                return '';
            propValue = JSON.parse(propValue);
        }
        else if (['longitude', 'latitude', 'altitude'].indexOf(propName) >= 0) {
            const places = (propName === 'altitude') ? 4 : 8;
            propValue = Number(propValue).toFixed(places);
        }
        else {
            if (['created_time', 'updated_time', 'user_created_time', 'user_updated_time'].indexOf(propName) >= 0) {
                propValue = (!propValue) ? '0' : moment(propValue, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x');
            }
            propValue = database_1.default.formatValue(ItemClass.fieldType(propName), propValue);
        }
        if (propName === 'body')
            return propValue;
        return typeof propValue === 'string' ? propValue
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\\n/g, '\\n')
            .replace(/\\\r/g, '\\r')
            : propValue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async serialize(item, shownKeys = null) {
        if (shownKeys === null) {
            shownKeys = this.itemClass(item).fieldNames();
            shownKeys.push('type_');
        }
        item = this.filter(item);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        if ('title' in item && shownKeys.indexOf('title') >= 0) {
            output.title = item.title;
        }
        if ('body' in item && shownKeys.indexOf('body') >= 0) {
            output.body = item.body;
        }
        output.props = [];
        for (let i = 0; i < shownKeys.length; i++) {
            let key = shownKeys[i];
            if (key === 'title' || key === 'body')
                continue;
            let value = null;
            if (typeof key === 'function') {
                const r = await key();
                key = r.key;
                value = r.value;
            }
            else {
                value = this.serialize_format(key, item[key]);
            }
            output.props.push(`${key}: ${value}`);
        }
        const temp = [];
        if (typeof output.title === 'string')
            temp.push(output.title);
        if (output.body)
            temp.push(output.body);
        if (output.props.length)
            temp.push(output.props.join('\n'));
        return temp.join('\n\n');
    }
    static encryptionService() {
        if (!this.encryptionService_)
            throw new Error('BaseItem.encryptionService_ is not set!!');
        return this.encryptionService_;
    }
    static revisionService() {
        if (!this.revisionService_)
            throw new Error('BaseItem.revisionService_ is not set!!');
        return this.revisionService_;
    }
    static shareService() {
        if (!this.shareService_)
            throw new Error('BaseItem.shareService_ is not set!!');
        return this.shareService_;
    }
    static async serializeForSync(item) {
        var _a;
        const ItemClass = this.itemClass(item);
        const shownKeys = ItemClass.fieldNames();
        shownKeys.push('type_');
        const share = item.share_id ? await this.shareService().shareById(item.share_id) : null;
        const serialized = await ItemClass.serialize(item, shownKeys);
        if (!(0, syncInfoUtils_1.getEncryptionEnabled)() || !ItemClass.encryptionSupported() || !(0, itemCanBeEncrypted_1.default)(item, share)) {
            // Normally not possible since itemsThatNeedSync should only return decrypted items
            if (item.encryption_applied)
                throw new JoplinError_1.default('Item is encrypted but encryption is currently disabled', 'cannotSyncEncrypted');
            return serialized;
        }
        if (item.encryption_applied) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const e = new Error('Trying to encrypt item that is already encrypted');
            e.code = 'cannotEncryptEncrypted';
            throw e;
        }
        let cipherText = null;
        try {
            cipherText = await this.encryptionService().encryptString(serialized, {
                masterKeyId: share && share.master_key_id ? share.master_key_id : '',
            });
        }
        catch (error) {
            if (error.code === 'masterKeyNotLoaded' && error.masterKeyId) {
                (_a = this.dispatch) === null || _a === void 0 ? void 0 : _a.call(this, {
                    type: 'MASTERKEY_ADD_NOT_LOADED',
                    id: error.masterKeyId,
                });
            }
            const msg = [`Could not encrypt item ${item.id}`];
            if (error && error.message)
                msg.push(error.message);
            const newError = new Error(msg.join(': '));
            newError.stack = error.stack;
            throw newError;
        }
        // List of keys that won't be encrypted - mostly foreign keys required to link items
        // with each others and timestamp required for synchronisation.
        const keepKeys = ['id', 'note_id', 'tag_id', 'parent_id', 'share_id', 'updated_time', 'deleted_time', 'type_'];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const reducedItem = {};
        for (let i = 0; i < keepKeys.length; i++) {
            const n = keepKeys[i];
            if (!item.hasOwnProperty(n))
                continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            reducedItem[n] = item[n];
        }
        reducedItem.encryption_applied = 1;
        reducedItem.encryption_cipher_text = cipherText;
        return ItemClass.serialize(reducedItem);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async decrypt(item) {
        if (!item.encryption_cipher_text)
            throw new Error(`Item is not encrypted: ${item.id}`);
        const ItemClass = this.itemClass(item);
        const plainText = await this.encryptionService().decryptString(item.encryption_cipher_text);
        // Note: decryption does not count has a change, so don't update any timestamp
        const plainItem = await ItemClass.unserialize(plainText);
        plainItem.updated_time = item.updated_time;
        plainItem.encryption_cipher_text = '';
        plainItem.encryption_applied = 0;
        return ItemClass.save(plainItem, { autoTimestamp: false, changeSource: ItemChange_1.default.SOURCE_DECRYPTION });
    }
    static async unserialize(content) {
        const lines = content.split('\n');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let output = {};
        let state = 'readingProps';
        const body = [];
        for (let i = lines.length - 1; i >= 0; i--) {
            let line = lines[i];
            if (state === 'readingProps') {
                line = line.trim();
                if (line === '') {
                    state = 'readingBody';
                    continue;
                }
                const p = line.indexOf(':');
                if (p < 0)
                    throw new Error(`Invalid property format: ${line}: ${content}`);
                const key = line.substr(0, p).trim();
                const value = line.substr(p + 1).trim();
                output[key] = value;
            }
            else if (state === 'readingBody') {
                body.splice(0, 0, line);
            }
        }
        if (!output.type_)
            throw new Error(`Missing required property: type_: ${content}`);
        output.type_ = Number(output.type_);
        if (body.length) {
            const title = body.splice(0, 2);
            output.title = title[0];
        }
        if (output.type_ === BaseModel_1.default.TYPE_NOTE)
            output.body = body.join('\n');
        const ItemClass = this.itemClass(output.type_);
        output = ItemClass.removeUnknownFields(output);
        for (const n in output) {
            if (!output.hasOwnProperty(n))
                continue;
            output[n] = await this.unserialize_format(output.type_, n, output[n]);
        }
        return output;
    }
    static async encryptedItemsStats() {
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
    static async encryptedItemsCount() {
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
    static async hasEncryptedItems() {
        const classNames = this.encryptableItemClassNames();
        for (let i = 0; i < classNames.length; i++) {
            const className = classNames[i];
            const ItemClass = this.getClass(className);
            const count = await ItemClass.count({ where: 'encryption_applied = 1' });
            if (count)
                return true;
        }
        return false;
    }
    static async itemsThatNeedDecryption(exclusions = [], limit = 100) {
        const classNames = this.encryptableItemClassNames();
        for (let i = 0; i < classNames.length; i++) {
            const className = classNames[i];
            const ItemClass = this.getClass(className);
            let whereSql = ['encryption_applied = 1'];
            if (className === 'Resource') {
                const blobDownloadedButEncryptedSql = 'encryption_blob_encrypted = 1 AND id IN (SELECT resource_id FROM resource_local_states WHERE fetch_status = 2))';
                whereSql = [`(encryption_applied = 1 OR (${blobDownloadedButEncryptedSql})`];
            }
            if (exclusions.length) {
                whereSql.push(`id NOT IN (${this.escapeIdsForSql(exclusions)})`);
            }
            const sql = sprintf(`
				SELECT *
				FROM %s
				WHERE %s
				LIMIT %d
				`, this.db().escapeField(ItemClass.tableName()), whereSql.join(' AND '), limit);
            const items = await ItemClass.modelSelectAll(sql);
            if (i >= classNames.length - 1) {
                return { hasMore: items.length >= limit, items: items };
            }
            else {
                if (items.length)
                    return { hasMore: true, items: items };
            }
        }
        throw new Error('Unreachable');
    }
    static async itemHasBeenSynced(itemId) {
        const r = await this.db().selectOne('SELECT item_id FROM sync_items WHERE item_id = ?', [itemId]);
        return !!r;
    }
    static async itemsThatNeedSync(syncTarget, limit = 100) {
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
            let extraWhere = [];
            if (className === 'Note')
                extraWhere.push('is_conflict = 0');
            if (className === 'Resource')
                extraWhere.push('encryption_blob_encrypted = 0');
            if (ItemClass.encryptionSupported())
                extraWhere.push('encryption_applied = 0');
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
			`, this.db().escapeFields(fieldNames), this.db().escapeField(ItemClass.tableName()), Number(syncTarget), extraWhere, limit);
            const neverSyncedItem = await ItemClass.modelSelectAll(sql);
            // Secondly get the items that have been synced under this sync target but that have been changed since then
            const newLimit = limit - neverSyncedItem.length;
            let changedItems = [];
            if (newLimit > 0) {
                fieldNames.push('sync_time');
                fieldNames.push('remote_item_updated_time');
                const sql = sprintf(`
					SELECT %s FROM %s items
					JOIN sync_items s ON s.item_id = items.id
					WHERE sync_target = %d
					AND (s.sync_time < items.updated_time OR force_sync = 1)
					AND s.sync_disabled = 0
					%s
					ORDER BY items.updated_time DESC
					LIMIT %d
				`, this.db().escapeFields(fieldNames), this.db().escapeField(ItemClass.tableName()), Number(syncTarget), extraWhere, newLimit);
                changedItems = await ItemClass.modelSelectAll(sql);
            }
            const neverSyncedItemIds = neverSyncedItem.map((it) => it.id);
            const items = neverSyncedItem.concat(changedItems);
            if (i >= classNames.length - 1) {
                return { hasMore: items.length >= limit, items: items, neverSyncedItemIds };
            }
            else {
                if (items.length)
                    return { hasMore: true, items: items, neverSyncedItemIds };
            }
        }
        throw new Error('Unreachable');
    }
    static syncItemClassNames() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return BaseItem.syncItemDefinitions_.map((def) => {
            return def.className;
        });
    }
    static encryptableItemClassNames() {
        const temp = this.syncItemClassNames();
        const output = [];
        for (let i = 0; i < temp.length; i++) {
            if (temp[i] === 'MasterKey')
                continue;
            output.push(temp[i]);
        }
        return output;
    }
    static syncItemTypes() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return BaseItem.syncItemDefinitions_.map((def) => {
            return def.type;
        });
    }
    static modelTypeToClassName(type) {
        for (let i = 0; i < BaseItem.syncItemDefinitions_.length; i++) {
            if (BaseItem.syncItemDefinitions_[i].type === type)
                return BaseItem.syncItemDefinitions_[i].className;
        }
        throw new Error(`Invalid type: ${type}`);
    }
    static async syncDisabledItems(syncTargetId) {
        const rows = await this.db().selectAll('SELECT * FROM sync_items WHERE sync_disabled = 1 AND sync_target = ?', [syncTargetId]);
        const output = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const item = await this.loadItem(row.item_type, row.item_id);
            if (row.item_location === BaseItem.SYNC_ITEM_LOCATION_LOCAL && !item)
                continue; // The referenced item no longer exist
            output.push({
                syncInfo: row,
                location: row.item_location,
                item: item,
                warning_ignored: row.sync_warning_ignored,
            });
        }
        return output;
    }
    static async syncDisabledItemsCount(syncTargetId, includeIgnored = false) {
        const whereQueries = ['sync_disabled = 1', 'sync_target = ?'];
        const whereArgs = [syncTargetId];
        if (!includeIgnored) {
            whereQueries.push('sync_warning_ignored = 0');
        }
        const r = await this.db().selectOne(`SELECT count(*) as total FROM sync_items WHERE ${whereQueries.join(' AND ')}`, whereArgs);
        return r ? r.total : 0;
    }
    static async syncDisabledItemsCountIncludingIgnored(syncTargetId) {
        return this.syncDisabledItemsCount(syncTargetId, true);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static updateSyncTimeQueries(syncTarget, item, syncTime, remoteItemUpdatedTime = 0, syncDisabled = false, syncDisabledReason = '', itemLocation = null) {
        const itemType = item.type_;
        const itemId = item.id;
        if (!itemType || !itemId || syncTime === undefined)
            throw new Error(sprintf('Invalid parameters in updateSyncTimeQueries(): %d, %s, %d', syncTarget, JSON.stringify(item), syncTime));
        if (itemLocation === null)
            itemLocation = BaseItem.SYNC_ITEM_LOCATION_LOCAL;
        return [
            {
                sql: 'DELETE FROM sync_items WHERE sync_target = ? AND item_type = ? AND item_id = ?',
                params: [syncTarget, itemType, itemId],
            },
            {
                sql: 'INSERT INTO sync_items (sync_target, item_type, item_id, item_location, sync_time, remote_item_updated_time, sync_disabled, sync_disabled_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                params: [syncTarget, itemType, itemId, itemLocation, syncTime, remoteItemUpdatedTime, syncDisabled ? 1 : 0, `${syncDisabledReason}`],
            },
        ];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async saveSyncTime(syncTarget, item, syncTime, remoteItemUpdatedTime = 0) {
        const queries = this.updateSyncTimeQueries(syncTarget, item, syncTime, remoteItemUpdatedTime);
        return this.db().transactionExecBatch(queries);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async saveSyncDisabled(syncTargetId, item, syncDisabledReason, itemLocation = null) {
        const syncTime = 'sync_time' in item ? item.sync_time : 0;
        const remoteItemUpdatedTime = 'remote_item_updated_time' in item ? item.remote_item_updated_time : 0;
        const queries = this.updateSyncTimeQueries(syncTargetId, item, syncTime, remoteItemUpdatedTime, true, syncDisabledReason, itemLocation);
        return this.db().transactionExecBatch(queries);
    }
    static async saveSyncEnabled(itemType, itemId) {
        await this.db().exec('DELETE FROM sync_items WHERE item_type = ? AND item_id = ?', [itemType, itemId]);
    }
    static async ignoreItemSyncWarning(syncTarget, item) {
        (0, object_1.checkObjectHasProperties)(item, ['type_', 'id']);
        const itemType = item.type_;
        const itemId = item.id;
        const sql = 'UPDATE sync_items SET sync_warning_ignored = ? WHERE item_id = ? AND item_type = ? AND sync_target = ?';
        const params = [1, itemId, itemType, syncTarget];
        await this.db().exec(sql, params);
    }
    // When an item is deleted, its associated sync_items data is not immediately deleted for
    // performance reason. So this function is used to look for these remaining sync_items and
    // delete them.
    static async deleteOrphanSyncItems() {
        const classNames = this.syncItemClassNames();
        const queries = [];
        for (let i = 0; i < classNames.length; i++) {
            const className = classNames[i];
            const ItemClass = this.getClass(className);
            let selectSql = `SELECT id FROM ${ItemClass.tableName()}`;
            if (ItemClass.modelType() === this.TYPE_NOTE)
                selectSql += ' WHERE is_conflict = 0';
            queries.push(`DELETE FROM sync_items WHERE item_location = ${BaseItem.SYNC_ITEM_LOCATION_LOCAL} AND item_type = ${ItemClass.modelType()} AND item_id NOT IN (${selectSql})`);
        }
        await this.db().transactionExecBatch(queries);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static displayTitle(item) {
        if (!item)
            return '';
        if (item.encryption_applied)
            return `🔑 ${(0, locale_1._)('Encrypted')}`;
        return item.title ? item.title : (0, locale_1._)('Untitled');
    }
    static async markAllNonEncryptedForSync() {
        const classNames = this.encryptableItemClassNames();
        for (let i = 0; i < classNames.length; i++) {
            const className = classNames[i];
            const ItemClass = this.getClass(className);
            const sql = sprintf(`
				SELECT id
				FROM %s
				WHERE encryption_applied = 0`, this.db().escapeField(ItemClass.tableName()));
            const items = await ItemClass.modelSelectAll(sql);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const ids = items.map((item) => {
                return item.id;
            });
            if (!ids.length)
                continue;
            await this.db().exec(`UPDATE sync_items SET force_sync = 1 WHERE item_id IN (${this.escapeIdsForSql(ids)})`);
        }
    }
    static async updateShareStatus(item, isShared) {
        if (!item.id || !item.type_)
            throw new Error('Item must have an ID and a type');
        if (!!item.is_shared === !!isShared)
            return false;
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
    static async forceSync(itemId) {
        await this.db().exec('UPDATE sync_items SET force_sync = 1 WHERE item_id = ?', [itemId]);
    }
    static async forceSyncAll() {
        await this.db().exec('UPDATE sync_items SET force_sync = 1');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async save(o, options = null) {
        if (!options)
            options = {};
        if (options.userSideValidation === true) {
            if (o.encryption_applied)
                throw new Error((0, locale_1._)('Encrypted items cannot be modified'));
        }
        const isNew = this.isNew(o, options);
        if ((0, readOnly_1.needsShareReadOnlyChecks)(this.modelType(), options.changeSource, this.syncShareCache, options.disableReadOnlyCheck)) {
            if (!isNew) {
                const previousItem = await this.loadItemByTypeAndId(this.modelType(), o.id, { fields: ['id', 'share_id'] });
                (0, readOnly_1.checkIfItemCanBeChanged)(this.modelType(), options.changeSource, previousItem, this.syncShareCache);
            }
            // If the item has a parent folder (a note or a sub-folder), check
            // that we're not adding the item to a read-only folder.
            if (o.parent_id) {
                await (0, readOnly_1.checkIfItemCanBeAddedToFolder)(this.modelType(), this.getClass('Folder'), options.changeSource, BaseItem.syncShareCache, o.parent_id);
            }
        }
        return super.save(o, options);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static markdownTag(itemOrId) {
        const item = typeof itemOrId === 'object' ? itemOrId : {
            id: itemOrId,
            title: '',
        };
        const output = [];
        output.push('[');
        output.push(markdownUtils_1.default.escapeTitleText(item.title));
        output.push(']');
        output.push(`(:/${item.id})`);
        return output.join('');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static isMarkdownTag(md) {
        if (!md)
            return false;
        return !!md.match(/^\[.*?\]\(:\/[0-9a-zA-Z]{32}\)$/);
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
BaseItem.encryptionService_ = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
BaseItem.revisionService_ = null;
BaseItem.shareService_ = null;
BaseItem.syncShareCache_ = null;
// Also update:
// - itemsThatNeedSync()
// - syncedItems()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
BaseItem.syncItemDefinitions_ = [
    { type: BaseModel_1.default.TYPE_NOTE, className: 'Note' },
    { type: BaseModel_1.default.TYPE_FOLDER, className: 'Folder' },
    { type: BaseModel_1.default.TYPE_RESOURCE, className: 'Resource' },
    { type: BaseModel_1.default.TYPE_TAG, className: 'Tag' },
    { type: BaseModel_1.default.TYPE_NOTE_TAG, className: 'NoteTag' },
    { type: BaseModel_1.default.TYPE_MASTER_KEY, className: 'MasterKey' },
    { type: BaseModel_1.default.TYPE_REVISION, className: 'Revision' },
];
BaseItem.SYNC_ITEM_LOCATION_LOCAL = 1;
BaseItem.SYNC_ITEM_LOCATION_REMOTE = 2;
exports.default = BaseItem;
