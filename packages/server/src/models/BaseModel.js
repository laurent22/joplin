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
exports.AclAction = exports.UuidType = void 0;
const types_1 = require("../services/database/types");
const TransactionHandler_1 = require("../utils/TransactionHandler");
const uuidgen_1 = require("../utils/uuidgen");
const errors_1 = require("../utils/errors");
const EventEmitter = require("events");
const personalizedUserContentBaseUrl_1 = require("@joplin/lib/services/joplinServer/personalizedUserContentBaseUrl");
const Logger_1 = require("@joplin/lib/Logger");
const dbuuid_1 = require("../utils/dbuuid");
const pagination_1 = require("./utils/pagination");
const array_1 = require("../utils/array");
const logger = Logger_1.default.create('BaseModel');
var UuidType;
(function (UuidType) {
    UuidType[UuidType["NanoId"] = 1] = "NanoId";
    UuidType[UuidType["Native"] = 2] = "Native";
})(UuidType = exports.UuidType || (exports.UuidType = {}));
var AclAction;
(function (AclAction) {
    AclAction[AclAction["Create"] = 1] = "Create";
    AclAction[AclAction["Read"] = 2] = "Read";
    AclAction[AclAction["Update"] = 3] = "Update";
    AclAction[AclAction["Delete"] = 4] = "Delete";
    AclAction[AclAction["List"] = 5] = "List";
})(AclAction = exports.AclAction || (exports.AclAction = {}));
class BaseModel {
    constructor(db, modelFactory, config) {
        this.defaultFields_ = [];
        this.savePoints_ = [];
        this.db_ = db; // we assign the model creation to a single db connection
        this.modelFactory_ = modelFactory; // what we are doing with this parameter is that we are giving the "BaseModel" class the ability to make more "Models" instances.
        this.config_ = config;
        this.transactionHandler_ = new TransactionHandler_1.default(db);
    }
    // When a model create an instance of another model, the active
    // connection is passed to it. That connection can be the regular db
    // connection, or the active transaction.
    // protected means these methods are accessible to the inheriting classes
    models(db = null) {
        return this.modelFactory_(db || this.db);
    }
    get baseUrl() {
        return this.config_.baseUrl;
    }
    get userContentBaseUrl() {
        return this.config_.userContentBaseUrl;
    }
    get env() {
        return this.config_.env;
    }
    personalizedUserContentBaseUrl(userId) {
        return (0, personalizedUserContentBaseUrl_1.default)(userId, this.baseUrl, this.userContentBaseUrl);
    }
    get appName() {
        return this.config_.appName;
    }
    get itemSizeHardLimit() {
        return this.config_.itemSizeHardLimit;
    }
    get db() {
        if (this.transactionHandler_.activeTransaction)
            return this.transactionHandler_.activeTransaction;
        return this.db_;
    }
    get defaultFields() {
        if (!this.defaultFields_.length) {
            this.defaultFields_ = Object.keys(types_1.databaseSchema[this.tableName]);
        }
        return this.defaultFields_.slice();
    }
    static get eventEmitter() {
        if (!this.eventEmitter_) {
            this.eventEmitter_ = new EventEmitter();
        }
        return this.eventEmitter_;
    }
    checkIfAllowed(_user, _action, _resource = null) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Must be overriden');
        });
    }
    selectFields(options, defaultFields = null, mainTable = '', requiredFields = []) {
        let output = [];
        if (options && options.fields) {
            output = options.fields;
        }
        else if (defaultFields) {
            output = defaultFields;
        }
        else {
            output = this.defaultFields;
        }
        if (!output.includes('*')) {
            for (const f of requiredFields) {
                if (!output.includes(f))
                    output.push(f);
            }
        }
        if (mainTable) {
            output = output.map(f => {
                if (f.includes(`${mainTable}.`))
                    return f;
                return `${mainTable}.${f}`;
            });
        }
        return output;
    }
    get tableName() {
        throw new Error('Not implemented');
    }
    get itemType() {
        throw new Error('Not implemented');
    }
    hasUuid() {
        return true;
    }
    uuidType() {
        return UuidType.NanoId;
    }
    autoTimestampEnabled() {
        return true;
    }
    hasUpdatedTime() {
        return this.autoTimestampEnabled();
    }
    get hasParentId() {
        return false;
    }
    // When using withTransaction, make sure any database call uses an instance
    // of `this.db()` that was accessed within the `fn` callback, otherwise the
    // transaction will be stuck!
    //
    // This for example, would result in a stuck transaction:
    //
    // const query = this.db(this.tableName).where('id', '=', id);
    //
    // this.withTransaction(async () => {
    //     await query.delete();
    // });
    //
    // This is because withTransaction is going to swap the value of "this.db()"
    // for as long as the transaction is active. So if the query is started
    // outside the transaction, it will use the regular db connection and wait
    // for the newly created transaction to finish, which will never happen.
    //
    // This is a bit of a leaky abstraction, which ideally should be improved
    // but for now one just has to be aware of the caveat.
    //
    // The `name` argument is only for debugging, so that any stuck transaction
    // can be more easily identified.
    withTransaction(fn, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const debugSteps = false;
            const debugTimeout = true;
            const timeoutMs = 10000;
            let txIndex = 0;
            const debugTimerId = debugTimeout ? setTimeout(() => {
                logger.error(`Transaction #${txIndex} did not complete:`, name);
                logger.error('Transaction stack:');
                logger.error(this.transactionHandler_.stackInfo);
            }, timeoutMs) : null;
            txIndex = yield this.transactionHandler_.start(name);
            if (debugSteps)
                console.info('START', name, txIndex);
            let output = null;
            try {
                output = yield fn();
            }
            catch (error) {
                if (debugSteps)
                    console.info('ROLLBACK', name, txIndex);
                yield this.transactionHandler_.rollback(txIndex);
                throw error;
            }
            finally {
                if (debugTimerId)
                    clearTimeout(debugTimerId);
            }
            if (debugSteps)
                console.info('COMMIT', name, txIndex);
            yield this.transactionHandler_.commit(txIndex);
            return output;
        });
    }
    all(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db(this.tableName).select(this.selectFields(options));
            return rows;
        });
    }
    allPaginated(pagination, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            pagination = Object.assign(Object.assign({}, (0, pagination_1.defaultPagination)()), pagination);
            const itemCount = yield this.count();
            let query = this
                .db(this.tableName)
                .select(this.selectFields(options));
            if (options.queryCallback)
                query = options.queryCallback(query);
            void query
                .orderBy(pagination.order[0].by, pagination.order[0].dir)
                .offset((pagination.page - 1) * pagination.limit)
                .limit(pagination.limit);
            const items = (yield query);
            return {
                items,
                page_count: Math.ceil(itemCount / pagination.limit),
                has_more: items.length >= pagination.limit,
            };
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this
                .db(this.tableName)
                .count('*', { as: 'item_count' });
            return r[0].item_count;
        });
    }
    fromApiInput(object) {
        const blackList = ['updated_time', 'created_time', 'owner_id'];
        const whiteList = Object.keys(types_1.databaseSchema[this.tableName]);
        const output = Object.assign({}, object);
        for (const f in object) {
            if (blackList.includes(f))
                delete output[f];
            if (!whiteList.includes(f))
                delete output[f];
        }
        return output;
    }
    objectToApiOutput(object) {
        return Object.assign({}, object);
    }
    toApiOutput(object) {
        if (Array.isArray(object)) {
            return object.map(f => this.objectToApiOutput(f));
        }
        else {
            return this.objectToApiOutput(object);
        }
    }
    validate(object, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.isNew && !object.id)
                throw new errors_1.ErrorUnprocessableEntity('id is missing');
            return object;
        });
    }
    isNew(object, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.isNew === false)
                return false;
            if (options.isNew === true)
                return true;
            if ('id' in object && !object.id)
                throw new Error('ID cannot be undefined or null');
            return !object.id;
        });
    }
    save(object, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!object)
                throw new Error('Object cannot be empty');
            const toSave = Object.assign({}, object);
            const isNew = yield this.isNew(object, options);
            if (this.hasUuid() && isNew && !toSave.id) {
                toSave.id = this.uuidType() === UuidType.NanoId ? (0, uuidgen_1.default)() : (0, dbuuid_1.default)();
            }
            if (this.autoTimestampEnabled()) {
                const timestamp = Date.now();
                if (isNew) {
                    toSave.created_time = timestamp;
                }
                if (this.hasUpdatedTime())
                    toSave.updated_time = timestamp;
            }
            if (options.skipValidation !== true)
                object = yield this.validate(object, { isNew: isNew, rules: options.validationRules ? options.validationRules : {} });
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                if (isNew) {
                    yield this.db(this.tableName).insert(toSave).queryContext(options.queryContext || {});
                }
                else {
                    const objectId = toSave.id;
                    if (!objectId)
                        throw new Error('Missing "id" property');
                    delete toSave.id;
                    const updatedCount = yield this.db(this.tableName).update(toSave).where({ id: objectId }).queryContext(options.queryContext || {});
                    toSave.id = objectId;
                    // Sanity check:
                    if (updatedCount !== 1)
                        throw new errors_1.ErrorBadRequest(`one row should have been updated, but ${updatedCount} row(s) were updated`);
                }
            }), 'BaseModel::save');
            return toSave;
        });
    }
    loadByIds(ids, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ids.length)
                return [];
            ids = (0, array_1.unique)(ids);
            return this.db(this.tableName).select(options.fields || this.defaultFields).whereIn('id', ids);
        });
    }
    setSavePoint() {
        return __awaiter(this, void 0, void 0, function* () {
            const name = `sp_${(0, uuidgen_1.default)()}`;
            yield this.db.raw(`SAVEPOINT ${name}`);
            this.savePoints_.push(name);
            return name;
        });
    }
    rollbackSavePoint(savePoint) {
        return __awaiter(this, void 0, void 0, function* () {
            const last = this.savePoints_.pop();
            if (last !== savePoint)
                throw new Error('Rollback save point does not match');
            yield this.db.raw(`ROLLBACK TO SAVEPOINT ${savePoint}`);
        });
    }
    releaseSavePoint(savePoint) {
        return __awaiter(this, void 0, void 0, function* () {
            const last = this.savePoints_.pop();
            if (last !== savePoint)
                throw new Error('Rollback save point does not match');
            yield this.db.raw(`RELEASE SAVEPOINT ${savePoint}`);
        });
    }
    exists(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const o = yield this.load(id, { fields: ['id'] });
            return !!o;
        });
    }
    load(id, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!id)
                throw new Error('id cannot be empty');
            return this.db(this.tableName).select(options.fields || this.defaultFields).where({ id: id }).first();
        });
    }
    delete(id, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!id)
                throw new Error('id cannot be empty');
            const ids = (typeof id === 'string' || typeof id === 'number') ? [id] : id;
            if (!ids.length)
                throw new Error('no id provided');
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                const query = this.db(this.tableName).where({ id: ids[0] });
                for (let i = 1; i < ids.length; i++) {
                    yield query.orWhere({ id: ids[i] });
                }
                const deletedCount = yield query.del();
                if (!options.allowNoOp && deletedCount !== ids.length)
                    throw new Error(`${ids.length} row(s) should have been deleted but ${deletedCount} row(s) were deleted. ID: ${id}`);
            }), 'BaseModel::delete');
        });
    }
}
exports.default = BaseModel;
BaseModel.eventEmitter_ = null;
//# sourceMappingURL=BaseModel.js.map