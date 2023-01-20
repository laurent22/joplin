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
const BaseModel_1 = require("./BaseModel");
const types_1 = require("../services/database/types");
const pagination_1 = require("./utils/pagination");
const joplinUtils_1 = require("../utils/joplinUtils");
const BaseModel_2 = require("@joplin/lib/BaseModel");
const errors_1 = require("../utils/errors");
const array_1 = require("../utils/array");
const StorageDriverBase_1 = require("./items/storage/StorageDriverBase");
const db_1 = require("../db");
const types_2 = require("../utils/types");
const loadStorageDriver_1 = require("./items/storage/loadStorageDriver");
const time_1 = require("../utils/time");
const Logger_1 = require("@joplin/lib/Logger");
const prettyBytes = require("pretty-bytes");
const mimeUtils = require('@joplin/lib/mime-utils.js').mime;
// Converts "root:/myfile.txt:" to "myfile.txt"
const extractNameRegex = /^root:\/(.*):$/;
class ItemModel extends BaseModel_1.default {
    constructor(db, modelFactory, config) {
        super(db, modelFactory, config);
        this.updatingTotalSizes_ = false;
        this.storageDriverConfig_ = config.storageDriver;
        this.storageDriverConfigFallback_ = config.storageDriverFallback;
    }
    get tableName() {
        return 'items';
    }
    get itemType() {
        return types_1.ItemType.Item;
    }
    get hasParentId() {
        return false;
    }
    get defaultFields() {
        return Object.keys(types_1.databaseSchema[this.tableName]).filter(f => f !== 'content');
    }
    loadStorageDriver(config) {
        return __awaiter(this, void 0, void 0, function* () {
            let driver = ItemModel.storageDrivers_.get(config);
            if (!driver) {
                driver = yield (0, loadStorageDriver_1.default)(config, this.db);
                ItemModel.storageDrivers_.set(config, driver);
            }
            return driver;
        });
    }
    storageDriver() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.loadStorageDriver(this.storageDriverConfig_);
        });
    }
    storageDriverFallback() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.storageDriverConfigFallback_)
                return null;
            return this.loadStorageDriver(this.storageDriverConfigFallback_);
        });
    }
    checkIfAllowed(user, action, resource = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action === BaseModel_1.AclAction.Create) {
                if (!(yield this.models().shareUser().isShareParticipant(resource.jop_share_id, user.id)))
                    throw new errors_1.ErrorForbidden('user has no access to this share');
            }
            // if (action === AclAction.Delete) {
            // 	const share = await this.models().share().byItemId(resource.id);
            // 	if (share && share.type === ShareType.JoplinRootFolder) {
            // 		if (user.id !== share.owner_id) throw new ErrorForbidden('only the owner of the shared notebook can delete it');
            // 	}
            // }
        });
    }
    fromApiInput(item) {
        const output = {};
        if ('id' in item)
            item.id = output.id;
        if ('name' in item)
            item.name = output.name;
        if ('mime_type' in item)
            item.mime_type = output.mime_type;
        return output;
    }
    objectToApiOutput(object) {
        const output = {};
        const propNames = ['id', 'name', 'updated_time', 'created_time'];
        for (const k of Object.keys(object)) {
            if (propNames.includes(k))
                output[k] = object[k];
        }
        return output;
    }
    userHasItem(userId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this
                .db('user_items')
                .select('user_items.id')
                .where('user_items.user_id', '=', userId)
                .where('user_items.item_id', '=', itemId)
                .first();
            return !!r;
        });
    }
    // Remove first and last colon from a path element
    pathToName(path) {
        if (path === 'root')
            return '';
        return path.replace(extractNameRegex, '$1');
    }
    byShareIdQuery(shareId, options = {}) {
        return this
            .db('items')
            .select(this.selectFields(options, null, 'items'))
            .where('jop_share_id', '=', shareId);
    }
    byShareId(shareId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.byShareIdQuery(shareId, options);
            return yield query;
        });
    }
    storageDriverWrite(itemId, content, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const storageDriver = yield this.storageDriver();
            const storageDriverFallback = yield this.storageDriverFallback();
            yield storageDriver.write(itemId, content, context);
            if (storageDriverFallback) {
                if (storageDriverFallback.mode === types_2.StorageDriverMode.ReadAndWrite) {
                    yield storageDriverFallback.write(itemId, content, context);
                }
                else if (storageDriverFallback.mode === types_2.StorageDriverMode.ReadAndClear) {
                    yield storageDriverFallback.write(itemId, Buffer.from(''), context);
                }
                else {
                    throw new Error(`Unsupported fallback mode: ${storageDriverFallback.mode}`);
                }
            }
        });
    }
    storageDriverRead(itemId, itemSize, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (itemSize > this.itemSizeHardLimit) {
                throw new errors_1.ErrorPayloadTooLarge(`Downloading items larger than ${prettyBytes(this.itemSizeHardLimit)} is currently disabled`);
            }
            const storageDriver = yield this.storageDriver();
            const storageDriverFallback = yield this.storageDriverFallback();
            if (!storageDriverFallback) {
                return storageDriver.read(itemId, context);
            }
            else {
                if (yield storageDriver.exists(itemId, context)) {
                    return storageDriver.read(itemId, context);
                }
                else {
                    if (!storageDriverFallback)
                        throw new Error(`Content does not exist but fallback content driver is not defined: ${itemId}`);
                    return storageDriverFallback.read(itemId, context);
                }
            }
        });
    }
    loadByJopIds(userId, jopIds, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!jopIds.length)
                return [];
            const userIds = Array.isArray(userId) ? userId : [userId];
            if (!userIds.length)
                return [];
            const rows = yield this
                .db('user_items')
                .leftJoin('items', 'items.id', 'user_items.item_id')
                .distinct(this.selectFields(options, null, 'items', ['items.content_size']))
                .whereIn('user_items.user_id', userIds)
                .whereIn('jop_id', jopIds);
            if (options.withContent) {
                for (const row of rows) {
                    row.content = yield this.storageDriverRead(row.id, row.content_size, { models: this.models() });
                }
            }
            return rows;
        });
    }
    loadByJopId(userId, jopId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = yield this.loadByJopIds(userId, [jopId], options);
            return items.length ? items[0] : null;
        });
    }
    loadByNames(userId, names, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!names.length)
                return [];
            const userIds = Array.isArray(userId) ? userId : [userId];
            const rows = yield this
                .db('user_items')
                .leftJoin('items', 'items.id', 'user_items.item_id')
                .distinct(this.selectFields(options, null, 'items', ['items.content_size']))
                .whereIn('user_items.user_id', userIds)
                .whereIn('name', names);
            if (options.withContent) {
                for (const row of rows) {
                    row.content = yield this.storageDriverRead(row.id, row.content_size, { models: this.models() });
                }
            }
            return rows;
        });
    }
    loadByName(userId, name, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = yield this.loadByNames(userId, [name], options);
            return items.length ? items[0] : null;
        });
    }
    loadWithContent(id, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this
                .db('user_items')
                .leftJoin('items', 'items.id', 'user_items.item_id')
                .select(this.selectFields(options, ['*'], 'items', ['items.content_size']))
                .where('items.id', '=', id)
                .first();
            const content = yield this.storageDriverRead(id, item.content_size, { models: this.models() });
            return Object.assign(Object.assign({}, item), { content });
        });
    }
    loadAsSerializedJoplinItem(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, joplinUtils_1.serializeJoplinItem)(yield this.loadAsJoplinItem(id));
        });
    }
    serializedContent(item) {
        return __awaiter(this, void 0, void 0, function* () {
            item = typeof item === 'string' ? yield this.loadWithContent(item) : item;
            if (item.jop_type > 0) {
                return Buffer.from(yield (0, joplinUtils_1.serializeJoplinItem)(this.itemToJoplinItem(item)));
            }
            else {
                return item.content;
            }
        });
    }
    atomicMoveContent(item, toDriver, drivers, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < 10; i++) {
                let fromDriver = drivers[item.content_storage_id];
                if (!fromDriver) {
                    fromDriver = yield (0, loadStorageDriver_1.default)(item.content_storage_id, this.db);
                    drivers[item.content_storage_id] = fromDriver;
                }
                let content = null;
                try {
                    content = yield fromDriver.read(item.id, { models: this.models() });
                }
                catch (error) {
                    if (error.code === errors_1.ErrorCode.NotFound) {
                        logger.info(`Could not process item, because content was deleted: ${item.id}`);
                        return;
                    }
                    throw error;
                }
                yield toDriver.write(item.id, content, { models: this.models() });
                const updatedRows = yield this
                    .db(this.tableName)
                    .where('id', '=', item.id)
                    .where('updated_time', '=', item.updated_time) // Check that the row hasn't changed while we were transferring the content
                    .update({ content_storage_id: toDriver.storageId }, (0, db_1.returningSupported)(this.db) ? ['id'] : undefined);
                // The item has been updated so we can return. Note that if the
                // database does not support RETURNING statement (like SQLite) we
                // have no way to check so we assume it's been done.
                if (!(0, db_1.returningSupported)(this.db) || updatedRows.length)
                    return;
                // If the row hasn't been updated, check that the item still exists
                // (that it didn't get deleted while we were uploading the content).
                const reloadedItem = yield this.load(item.id, { fields: ['id'] });
                if (!reloadedItem) {
                    // Item was deleted so we remove the content we've just
                    // uploaded.
                    logger.info(`Could not process item, because it was deleted: ${item.id}`);
                    yield toDriver.delete(item.id, { models: this.models() });
                    return;
                }
                yield (0, time_1.msleep)(1000 + 1000 * i);
            }
            throw new Error(`Could not atomically update content for item: ${JSON.stringify(item)}`);
        });
    }
    // Loop throught the items in the database and import their content to the
    // target storage. Only items not already in that storage will be processed.
    importContentToStorage(toStorageConfig, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ batchSize: 1000, maxContentSize: 200000000, logger: new Logger_1.default() }, options);
            const toStorageDriver = toStorageConfig instanceof StorageDriverBase_1.default ? toStorageConfig : yield this.loadStorageDriver(toStorageConfig);
            const fromDrivers = {};
            const itemCount = (yield this.db(this.tableName)
                .count('id', { as: 'total' })
                .where('content_storage_id', '!=', toStorageDriver.storageId)
                .first())['total'];
            const skippedItemIds = [];
            let totalDone = 0;
            while (true) {
                const query = this
                    .db(this.tableName)
                    .select(['id', 'content_storage_id', 'content_size', 'updated_time'])
                    .where('content_storage_id', '!=', toStorageDriver.storageId);
                if (skippedItemIds.length)
                    void query.whereNotIn('id', skippedItemIds);
                void query.limit(options.batchSize);
                const items = yield query;
                options.logger.info(`Processing items ${totalDone} / ${itemCount}`);
                if (!items.length) {
                    options.logger.info(`All items have been processed. Total: ${totalDone}`);
                    options.logger.info(`Skipped items: ${skippedItemIds.join(', ')}`);
                    return;
                }
                for (const item of items) {
                    if (item.content_size > options.maxContentSize) {
                        options.logger.warn(`Skipped item "${item.id}" (Size: ${prettyBytes(item.content_size)}) because it is over the size limit (${prettyBytes(options.maxContentSize)})`);
                        skippedItemIds.push(item.id);
                        continue;
                    }
                    try {
                        yield this.atomicMoveContent(item, toStorageDriver, fromDrivers, options.logger);
                    }
                    catch (error) {
                        options.logger.error(error);
                    }
                }
                totalDone += items.length;
            }
        });
    }
    deleteDatabaseContentColumn(options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, db_1.returningSupported)(this.db))
                throw new Error('Not supported by this database driver');
            options = Object.assign({ batchSize: 1000, logger: new Logger_1.default(), maxProcessedItems: 0 }, options);
            // const itemCount = (await this.db(this.tableName)
            // 	.count('id', { as: 'total' })
            // 	.where('content', '!=', Buffer.from(''))
            // 	.first())['total'];
            let totalDone = 0;
            // UPDATE items SET content = '\x' WHERE id IN (SELECT id FROM items WHERE content != '\x' LIMIT 5000);
            while (true) {
                options.logger.info(`Processing items ${totalDone}`);
                const updatedRows = yield this
                    .db(this.tableName)
                    .update({ content: Buffer.from('') }, ['id'])
                    .whereIn('id', this.db(this.tableName)
                    .select(['id'])
                    .where('content', '!=', Buffer.from(''))
                    .limit(options.batchSize));
                totalDone += updatedRows.length;
                if (!updatedRows.length) {
                    options.logger.info(`All items have been processed. Total: ${totalDone}`);
                    return;
                }
                if (options.maxProcessedItems && totalDone + options.batchSize > options.maxProcessedItems) {
                    options.logger.info(`Processed ${totalDone} items out of requested ${options.maxProcessedItems}`);
                    return;
                }
                yield (0, time_1.msleep)(1000);
            }
        });
    }
    dbContent(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.db(this.tableName).select(['content']).where('id', itemId).first();
            return row.content;
        });
    }
    sharedFolderChildrenItems(shareUserIds, folderId, includeResources = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!shareUserIds.length)
                throw new Error('User IDs must be specified');
            let output = [];
            const folderAndNotes = yield this
                .db('user_items')
                .leftJoin('items', 'items.id', 'user_items.item_id')
                .distinct('items.id', 'items.jop_id', 'items.jop_type')
                .where('items.jop_parent_id', '=', folderId)
                .whereIn('user_items.user_id', shareUserIds)
                .whereIn('jop_type', [BaseModel_2.ModelType.Folder, BaseModel_2.ModelType.Note]);
            for (const item of folderAndNotes) {
                output.push(item);
                if (item.jop_type === BaseModel_2.ModelType.Folder) {
                    const children = yield this.sharedFolderChildrenItems(shareUserIds, item.jop_id, false);
                    output = output.concat(children);
                }
            }
            if (includeResources) {
                const noteItemIds = output.filter(i => i.jop_type === BaseModel_2.ModelType.Note).map(i => i.id);
                const itemResourceIds = yield this.models().itemResource().byItemIds(noteItemIds);
                for (const itemId in itemResourceIds) {
                    // TODO: should be resources with that path, that belong to any of the share users
                    const resourceItems = yield this.models().item().loadByJopIds(shareUserIds, itemResourceIds[itemId]);
                    for (const resourceItem of resourceItems) {
                        output.push({
                            id: resourceItem.id,
                            jop_id: resourceItem.jop_id,
                            jop_type: BaseModel_2.ModelType.Resource,
                        });
                    }
                }
                let allResourceIds = [];
                for (const itemId in itemResourceIds) {
                    allResourceIds = allResourceIds.concat(itemResourceIds[itemId]);
                }
                // TODO: should be resources with that path, that belong to any of the share users
                const blobItems = yield this.models().itemResource().blobItemsByResourceIds(shareUserIds, allResourceIds);
                for (const blobItem of blobItems) {
                    output.push({
                        id: blobItem.id,
                        name: blobItem.name,
                    });
                }
            }
            return output;
        });
    }
    itemToJoplinItem(itemRow) {
        if (itemRow.jop_type <= 0)
            throw new Error(`Not a Joplin item: ${itemRow.id}`);
        if (!itemRow.content)
            throw new Error('Item content is missing');
        const item = JSON.parse(itemRow.content.toString());
        item.id = itemRow.jop_id;
        item.parent_id = itemRow.jop_parent_id;
        item.share_id = itemRow.jop_share_id;
        item.type_ = itemRow.jop_type;
        item.encryption_applied = itemRow.jop_encryption_applied;
        item.updated_time = itemRow.jop_updated_time;
        return item;
    }
    loadAsJoplinItem(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = yield this.loadWithContent(id);
            return this.itemToJoplinItem(raw);
        });
    }
    saveFromRawContent(user, rawContentItems, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            if (!Array.isArray(rawContentItems))
                rawContentItems = [rawContentItems];
            const existingItems = yield this.loadByNames(user.id, rawContentItems.map(i => i.name));
            const itemsToProcess = {};
            for (const rawItem of rawContentItems) {
                try {
                    const isJoplinItem = (0, joplinUtils_1.isJoplinItemName)(rawItem.name);
                    let isNote = false;
                    const item = {
                        name: rawItem.name,
                    };
                    let joplinItem = null;
                    let resourceIds = [];
                    if (isJoplinItem) {
                        joplinItem = yield (0, joplinUtils_1.unserializeJoplinItem)(rawItem.body.toString());
                        isNote = joplinItem.type_ === BaseModel_2.ModelType.Note;
                        resourceIds = isNote ? (0, joplinUtils_1.linkedResourceIds)(joplinItem.body) : [];
                        item.jop_id = joplinItem.id;
                        item.jop_parent_id = joplinItem.parent_id || '';
                        item.jop_type = joplinItem.type_;
                        item.jop_encryption_applied = joplinItem.encryption_applied || 0;
                        item.jop_share_id = joplinItem.share_id || '';
                        item.jop_updated_time = joplinItem.updated_time;
                        const joplinItemToSave = Object.assign({}, joplinItem);
                        delete joplinItemToSave.id;
                        delete joplinItemToSave.parent_id;
                        delete joplinItemToSave.share_id;
                        delete joplinItemToSave.type_;
                        delete joplinItemToSave.encryption_applied;
                        delete joplinItemToSave.updated_time;
                        item.content = Buffer.from(JSON.stringify(joplinItemToSave));
                    }
                    else {
                        item.content = rawItem.body;
                    }
                    const existingItem = existingItems.find(i => i.name === rawItem.name);
                    if (existingItem)
                        item.id = existingItem.id;
                    if (options.shareId)
                        item.jop_share_id = options.shareId;
                    yield this.models().user().checkMaxItemSizeLimit(user, rawItem.body, item, joplinItem);
                    itemsToProcess[rawItem.name] = {
                        item: item,
                        error: null,
                        resourceIds,
                        isNote,
                        joplinItem,
                    };
                }
                catch (error) {
                    itemsToProcess[rawItem.name] = {
                        item: null,
                        error: error,
                    };
                }
            }
            const output = {};
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (const name of Object.keys(itemsToProcess)) {
                    const o = itemsToProcess[name];
                    if (o.error) {
                        output[name] = {
                            item: null,
                            error: o.error,
                        };
                        continue;
                    }
                    const itemToSave = Object.assign({}, o.item);
                    try {
                        const content = itemToSave.content;
                        delete itemToSave.content;
                        itemToSave.content_storage_id = (yield this.storageDriver()).storageId;
                        itemToSave.content_size = content ? content.byteLength : 0;
                        // Here we save the item row and content, and we want to
                        // make sure that either both are saved or none of them.
                        // This is done by setting up a save point before saving the
                        // row, and rollbacking if the content cannot be saved.
                        //
                        // Normally, since we are in a transaction, throwing an
                        // error should work, but since we catch all errors within
                        // this block it doesn't work.
                        // TODO: When an item is uploaded multiple times
                        // simultaneously there could be a race condition, where the
                        // content would not match the db row (for example, the
                        // content_size would differ).
                        //
                        // Possible solutions:
                        //
                        // - Row-level lock on items.id, and release once the
                        //   content is saved.
                        // - Or external lock - eg. Redis.
                        const savePoint = yield this.setSavePoint();
                        const savedItem = yield this.saveForUser(user.id, itemToSave);
                        try {
                            yield this.storageDriverWrite(savedItem.id, content, { models: this.models() });
                            yield this.releaseSavePoint(savePoint);
                        }
                        catch (error) {
                            yield this.rollbackSavePoint(savePoint);
                            throw error;
                        }
                        if (o.isNote) {
                            yield this.models().itemResource().deleteByItemId(savedItem.id);
                            yield this.models().itemResource().addResourceIds(savedItem.id, o.resourceIds);
                        }
                        output[name] = {
                            item: savedItem,
                            error: null,
                        };
                    }
                    catch (error) {
                        output[name] = {
                            item: null,
                            error: error,
                        };
                    }
                }
            }), 'ItemModel::saveFromRawContent');
            return output;
        });
    }
    validate(item, options = {}) {
        const _super = Object.create(null, {
            validate: { get: () => super.validate }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (options.isNew) {
                if (!item.name)
                    throw new errors_1.ErrorUnprocessableEntity('name cannot be empty');
            }
            else {
                if ('name' in item && !item.name)
                    throw new errors_1.ErrorUnprocessableEntity('name cannot be empty');
            }
            if (item.jop_share_id) {
                if (!(yield this.models().share().exists(item.jop_share_id)))
                    throw new errors_1.ErrorUnprocessableEntity(`share not found: ${item.jop_share_id}`);
            }
            return _super.validate.call(this, item, options);
        });
    }
    childrenQuery(userId, pathQuery = '', count = false, options = {}) {
        const query = this
            .db('user_items')
            .innerJoin('items', 'user_items.item_id', 'items.id')
            .where('user_items.user_id', '=', userId);
        if (count) {
            void query.countDistinct('items.id', { as: 'total' });
        }
        else {
            void query.select(this.selectFields(options, ['id', 'name', 'updated_time'], 'items'));
        }
        if (pathQuery) {
            // We support /* as a prefix only. Anywhere else would have
            // performance issue or requires a revert index.
            const sqlLike = pathQuery.replace(/\/\*$/g, '/%');
            void query.where('name', 'like', sqlLike);
        }
        return query;
    }
    itemUrl() {
        return `${this.baseUrl}/items`;
    }
    itemContentUrl(itemId) {
        return `${this.baseUrl}/items/${itemId}/content`;
    }
    children(userId, pathQuery = '', pagination = null, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            pagination = pagination || (0, pagination_1.defaultPagination)();
            const query = this.childrenQuery(userId, pathQuery, false, options);
            return (0, pagination_1.paginateDbQuery)(query, pagination, 'items');
        });
    }
    childrenCount(userId, pathQuery = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.childrenQuery(userId, pathQuery, true);
            const r = yield query.first();
            return r ? r.total : 0;
        });
    }
    joplinItemPath(jopId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use Recursive Common Table Expression to find path to given item
            // https://www.sqlite.org/lang_with.html#recursivecte
            // with recursive paths(id, jop_id, jop_parent_id) as (
            //     select id, jop_id, jop_parent_id from items where jop_id = '000000000000000000000000000000F1'
            //     union
            //     select items.id, items.jop_id, items.jop_parent_id
            //     from items join paths where items.jop_id = paths.jop_parent_id
            // )
            // select id, jop_id, jop_parent_id from paths;
            return this.db.withRecursive('paths', (qb) => {
                void qb.select('id', 'jop_id', 'jop_parent_id')
                    .from('items')
                    .where('jop_id', '=', jopId)
                    .whereIn('jop_type', [BaseModel_2.ModelType.Note, BaseModel_2.ModelType.Folder])
                    .union((qb) => {
                    void qb
                        .select('items.id', 'items.jop_id', 'items.jop_parent_id')
                        .from('items')
                        .join('paths', 'items.jop_id', 'paths.jop_parent_id')
                        .whereIn('jop_type', [BaseModel_2.ModelType.Note, BaseModel_2.ModelType.Folder]);
                });
            }).select('id', 'jop_id', 'jop_parent_id').from('paths');
        });
    }
    // If the note or folder is within a shared folder, this function returns
    // that shared folder. It returns null otherwise.
    joplinItemSharedRootInfo(jopId) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = yield this.joplinItemPath(jopId);
            if (!path.length)
                throw new errors_1.ApiError(`Cannot retrieve path for item: ${jopId}`, null, 'noPathForItem');
            const rootFolderItem = path[path.length - 1];
            const share = yield this.models().share().itemShare(types_1.ShareType.Folder, rootFolderItem.id);
            if (!share)
                return null;
            return {
                item: yield this.load(rootFolderItem.id),
                share,
            };
        });
    }
    allForDebug() {
        return __awaiter(this, void 0, void 0, function* () {
            const items = yield this.all({ fields: ['*'] });
            return items.map(i => {
                if (!i.content)
                    return i;
                i.content = i.content.toString();
                return i;
            });
        });
    }
    shouldRecordChange(itemName) {
        if ((0, joplinUtils_1.isJoplinItemName)(itemName))
            return true;
        if ((0, joplinUtils_1.isJoplinResourceBlobPath)(itemName))
            return true;
        return false;
    }
    isRootSharedFolder(item) {
        return item.jop_type === BaseModel_2.ModelType.Folder && item.jop_parent_id === '' && !!item.jop_share_id;
    }
    // Returns the item IDs that are owned only by the given user. In other
    // words, the items that are not shared with anyone else. Such items
    // can be safely deleted when the user is deleted.
    // public async exclusivelyOwnedItemIds(userId: Uuid): Promise<Uuid[]> {
    // 	const query = this
    // 		.db('items')
    // 		.select(this.db.raw('items.id, count(user_items.item_id) as user_item_count'))
    // 		.leftJoin('user_items', 'user_items.item_id', 'items.id')
    // 		.whereIn('items.id', this.db('user_items').select('user_items.item_id').where('user_id', '=', userId))
    // 		.groupBy('items.id');
    // 	const rows: any[] = await query;
    // 	return rows.filter(r => r.user_item_count === 1).map(r => r.id);
    // }
    // public async deleteExclusivelyOwnedItems(userId: Uuid) {
    // 	const itemIds = await this.exclusivelyOwnedItemIds(userId);
    // 	await this.delete(itemIds);
    // }
    deleteAll(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                const page = yield this.children(userId, '', Object.assign(Object.assign({}, (0, pagination_1.defaultPagination)()), { limit: 1000 }));
                yield this.delete(page.items.map(c => c.id));
                if (!page.has_more)
                    break;
            }
        });
    }
    delete(id, options = {}) {
        const _super = Object.create(null, {
            delete: { get: () => super.delete }
        });
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ deleteChanges: false }, options);
            const ids = typeof id === 'string' ? [id] : id;
            if (!ids.length)
                return;
            const storageDriver = yield this.storageDriver();
            const storageDriverFallback = yield this.storageDriverFallback();
            const shares = yield this.models().share().byItemIds(ids);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                yield this.models().share().delete(shares.map(s => s.id));
                yield this.models().userItem().deleteByItemIds(ids, { recordChanges: !options.deleteChanges });
                yield this.models().itemResource().deleteByItemIds(ids);
                yield storageDriver.delete(ids, { models: this.models() });
                if (storageDriverFallback)
                    yield storageDriverFallback.delete(ids, { models: this.models() });
                yield _super.delete.call(this, ids, options);
                if (options.deleteChanges)
                    yield this.models().change().deleteByItemIds(ids);
            }), 'ItemModel::delete');
        });
    }
    deleteForUser(userId, item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRootSharedFolder(item)) {
                const share = yield this.models().share().byItemId(item.id);
                if (!share)
                    throw new Error(`Cannot find share associated with item ${item.id}`);
                const userShare = yield this.models().shareUser().byShareAndUserId(share.id, userId);
                if (!userShare)
                    return;
                yield this.models().shareUser().delete(userShare.id);
            }
            else {
                yield this.delete(item.id);
            }
        });
    }
    makeTestItem(userId, num) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.saveForUser(userId, {
                name: `${num.toString().padStart(32, '0')}.md`,
                content: Buffer.from(''),
            });
        });
    }
    makeTestItems(userId, count) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                for (let i = 1; i <= count; i++) {
                    yield this.saveForUser(userId, {
                        name: `${i.toString().padStart(32, '0')}.md`,
                        content: Buffer.from(''),
                    });
                }
            }), 'ItemModel::makeTestItems');
        });
    }
    // This method should be private because items should only be saved using
    // saveFromRawContent, which is going to deal with the content driver. But
    // since it's used in various test units, it's kept public for now.
    saveForUser(userId, item, options = {}) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId)
                throw new Error('userId is required');
            item = Object.assign({}, item);
            const isNew = yield this.isNew(item, options);
            let previousItem = null;
            if (item.content && !item.content_storage_id) {
                item.content_storage_id = (yield this.storageDriver()).storageId;
            }
            if (isNew) {
                if (!item.mime_type)
                    item.mime_type = mimeUtils.fromFilename(item.name) || '';
                if (!item.owner_id)
                    item.owner_id = userId;
            }
            else {
                const beforeSaveItem = (yield this.load(item.id, { fields: ['name', 'jop_type', 'jop_parent_id', 'jop_share_id'] }));
                const resourceIds = beforeSaveItem.jop_type === BaseModel_2.ModelType.Note ? yield this.models().itemResource().byItemId(item.id) : [];
                previousItem = {
                    jop_parent_id: beforeSaveItem.jop_parent_id,
                    name: beforeSaveItem.name,
                    jop_resource_ids: resourceIds,
                    jop_share_id: beforeSaveItem.jop_share_id,
                };
            }
            return this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                item = yield _super.save.call(this, item, options);
                if (isNew)
                    yield this.models().userItem().add(userId, item.id);
                // We only record updates. This because Create and Update events are
                // per user, whenever a user_item is created or deleted.
                const changeItemName = item.name || previousItem.name;
                if (!isNew && this.shouldRecordChange(changeItemName)) {
                    yield this.models().change().save({
                        item_type: this.itemType,
                        item_id: item.id,
                        item_name: changeItemName,
                        type: isNew ? types_1.ChangeType.Create : types_1.ChangeType.Update,
                        previous_item: previousItem ? this.models().change().serializePreviousItem(previousItem) : '',
                        user_id: userId,
                    });
                }
                return item;
            }), 'ItemModel::saveForUser');
        });
    }
    updateTotalSizes() {
        return __awaiter(this, void 0, void 0, function* () {
            // Total sizes are updated once an hour, so unless there's something
            // very wrong this error shouldn't happen.
            if (this.updatingTotalSizes_)
                throw new Error('Already updating total sizes');
            this.updatingTotalSizes_ = true;
            const doneUserIds = {};
            try {
                while (true) {
                    const latestProcessedChange = yield this.models().keyValue().value('ItemModel::updateTotalSizes::latestProcessedChange');
                    const paginatedChanges = yield this.models().change().allFromId(latestProcessedChange || '');
                    const changes = paginatedChanges.items;
                    if (!changes.length) {
                        // `allFromId()` may return empty pages when all items have
                        // been deleted. In that case, we only save the cursor and
                        // continue.
                        yield this.models().keyValue().setValue('ItemModel::updateTotalSizes::latestProcessedChange', paginatedChanges.cursor);
                    }
                    else {
                        const itemIds = (0, array_1.unique)(changes.map(c => c.item_id));
                        const userItems = yield this.db('user_items').select('user_id').whereIn('item_id', itemIds);
                        const userIds = (0, array_1.unique)(userItems
                            .map(u => u.user_id)
                            .concat(changes.map(c => c.user_id)));
                        const totalSizes = [];
                        for (const userId of userIds) {
                            if (doneUserIds[userId])
                                continue;
                            totalSizes.push({
                                userId,
                                totalSize: yield this.calculateUserTotalSize(userId),
                            });
                            doneUserIds[userId] = true;
                        }
                        yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                            for (const row of totalSizes) {
                                yield this.models().user().save({
                                    id: row.userId,
                                    total_item_size: row.totalSize,
                                });
                            }
                            yield this.models().keyValue().setValue('ItemModel::updateTotalSizes::latestProcessedChange', paginatedChanges.cursor);
                        }), 'ItemModel::updateTotalSizes');
                    }
                    if (!paginatedChanges.has_more)
                        break;
                }
            }
            finally {
                this.updatingTotalSizes_ = false;
            }
        });
    }
    calculateUserTotalSize(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.db('items')
                .sum('items.content_size', { as: 'total' })
                .leftJoin('user_items', 'items.id', 'user_items.item_id')
                .where('user_items.user_id', userId)
                .first();
            return result && result.total ? result.total : 0;
        });
    }
    save(_item, _options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Use saveForUser()');
            // return this.saveForUser('', item, options);
        });
    }
}
exports.default = ItemModel;
ItemModel.storageDrivers_ = new Map();
//# sourceMappingURL=ItemModel.js.map