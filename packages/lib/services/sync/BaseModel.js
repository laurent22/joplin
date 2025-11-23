"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelType = void 0;
const paginationToSql_1 = require("./models/utils/paginationToSql");
const database_1 = require("./database");
const time_1 = require("./time");
const ActionLogger_1 = require("./utils/ActionLogger");
const uuid_1 = require("./uuid");
const Mutex = require('async-mutex').Mutex;
// New code should make use of this enum
var ModelType;
(function (ModelType) {
    ModelType[ModelType["Note"] = 1] = "Note";
    ModelType[ModelType["Folder"] = 2] = "Folder";
    ModelType[ModelType["Setting"] = 3] = "Setting";
    ModelType[ModelType["Resource"] = 4] = "Resource";
    ModelType[ModelType["Tag"] = 5] = "Tag";
    ModelType[ModelType["NoteTag"] = 6] = "NoteTag";
    ModelType[ModelType["Search"] = 7] = "Search";
    ModelType[ModelType["Alarm"] = 8] = "Alarm";
    ModelType[ModelType["MasterKey"] = 9] = "MasterKey";
    ModelType[ModelType["ItemChange"] = 10] = "ItemChange";
    ModelType[ModelType["NoteResource"] = 11] = "NoteResource";
    ModelType[ModelType["ResourceLocalState"] = 12] = "ResourceLocalState";
    ModelType[ModelType["Revision"] = 13] = "Revision";
    ModelType[ModelType["Migration"] = 14] = "Migration";
    ModelType[ModelType["SmartFilter"] = 15] = "SmartFilter";
    ModelType[ModelType["Command"] = 16] = "Command";
})(ModelType || (exports.ModelType = ModelType = {}));
class BaseModel {
    static modelType() {
        throw new Error('Must be overriden');
    }
    static tableName() {
        throw new Error('Must be overriden');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static setDb(db) {
        this.db_ = db;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static addModelMd(model) {
        if (!model)
            return model;
        if (Array.isArray(model)) {
            const output = [];
            for (let i = 0; i < model.length; i++) {
                output.push(this.addModelMd(model[i]));
            }
            return output;
        }
        else {
            model = Object.assign({}, model);
            model.type_ = this.modelType();
            return model;
        }
    }
    static logger() {
        return this.db().logger();
    }
    static useUuid() {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static byId(items, id) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === id)
                return items[i];
        }
        return null;
    }
    static defaultValues(fieldNames) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        for (const n of fieldNames) {
            output[n] = this.db().fieldDefaultValue(this.tableName(), n);
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static modelIndexById(items, id) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === id)
                return i;
        }
        return -1;
    }
    static modelsByIds(items, ids) {
        const output = [];
        // Prefer a `Set` to using `ids.includes` -- this gives a better running time.
        const idSet = new Set(ids);
        for (const item of items) {
            if (idSet.has(item.id)) {
                output.push(item);
            }
        }
        return output;
    }
    // Prefer the use of this function to compare IDs as it handles the case where
    // one ID is null and the other is "", in which case they are actually considered to be the same.
    static idsEqual(id1, id2) {
        if (!id1 && !id2)
            return true;
        if (!id1 && !!id2)
            return false;
        if (!!id1 && !id2)
            return false;
        return id1 === id2;
    }
    static modelTypeToName(type) {
        for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
            const e = BaseModel.typeEnum_[i];
            if (e[1] === type)
                return e[0].substr(5).toLowerCase();
        }
        throw new Error(`Unknown model type: ${type}`);
    }
    static modelNameToType(name) {
        for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
            const e = BaseModel.typeEnum_[i];
            const eName = e[0].substr(5).toLowerCase();
            if (eName === name)
                return e[1];
        }
        throw new Error(`Unknown model name: ${name}`);
    }
    static hasField(name) {
        const fields = this.fieldNames();
        return fields.indexOf(name) >= 0;
    }
    static fieldNames(withPrefix = false) {
        const output = this.db().tableFieldNames(this.tableName());
        if (!withPrefix)
            return output;
        const p = withPrefix === true ? this.tableName() : withPrefix;
        const temp = [];
        for (let i = 0; i < output.length; i++) {
            temp.push(`${p}.${output[i]}`);
        }
        return temp;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static fieldType(name, defaultValue = null) {
        const fields = this.fields();
        for (let i = 0; i < fields.length; i++) {
            if (fields[i].name === name)
                return fields[i].type;
        }
        if (defaultValue !== null)
            return defaultValue;
        throw new Error(`Unknown field: ${name}`);
    }
    static fields() {
        return this.db().tableFields(this.tableName());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static removeUnknownFields(model) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const newModel = {};
        for (const n in model) {
            if (!model.hasOwnProperty(n))
                continue;
            if (!this.hasField(n) && n !== 'type_')
                continue;
            newModel[n] = model[n];
        }
        return newModel;
    }
    static new() {
        const fields = this.fields();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        for (let i = 0; i < fields.length; i++) {
            const f = fields[i];
            output[f.name] = f.default;
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static modOptions(options) {
        if (!options) {
            options = {};
        }
        else {
            options = Object.assign({}, options);
        }
        if (!('isNew' in options))
            options.isNew = 'auto';
        if (!('autoTimestamp' in options))
            options.autoTimestamp = true;
        if (!('userSideValidation' in options))
            options.userSideValidation = false;
        return options;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static count(options = null) {
        if (!options)
            options = {};
        let sql = `SELECT count(*) as total FROM \`${this.tableName()}\``;
        if (options.where)
            sql += ` WHERE ${options.where}`;
        return this.db()
            .selectOne(sql)
            // eslint-disable-next-line promise/prefer-await-to-then, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
            .then((r) => {
            return r ? r['total'] : 0;
        });
    }
    static load(id, options = null) {
        return this.loadByField('id', id, options);
    }
    static shortId(id) {
        return id.substr(0, 5);
    }
    static loadByPartialId(partialId) {
        return this.modelSelectAll(`SELECT * FROM \`${this.tableName()}\` WHERE \`id\` LIKE ?`, [`${partialId}%`]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static applySqlOptions(options, sql, params = null) {
        if (!options)
            options = {};
        if (options.order && options.order.length) {
            sql += ` ORDER BY ${(0, paginationToSql_1.default)({
                limit: options.limit,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                order: options.order,
                page: 1,
                caseInsensitive: options.caseInsensitive,
            })}`;
        }
        if (options.limit)
            sql += ` LIMIT ${options.limit}`;
        return { sql: sql, params: params };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async allIds(options = null) {
        const q = this.applySqlOptions(options, `SELECT id FROM \`${this.tableName()}\``);
        const rows = await this.db().selectAll(q.sql, q.params);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return rows.map((r) => r.id);
    }
    static async all(options = null) {
        if (!options)
            options = {};
        if (!options.fields)
            options.fields = '*';
        let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let params = [];
        if (options.where) {
            sql += ` WHERE ${options.where}`;
            if (options.whereParams)
                params = params.concat(options.whereParams);
        }
        const q = this.applySqlOptions(options, sql, params);
        return this.modelSelectAll(q.sql, q.params);
    }
    static escapeIdsForSql(ids) {
        return this.db().escapeValues(ids).join(', ');
    }
    static async byIds(ids, options = null) {
        if (!ids.length)
            return [];
        if (!options)
            options = {};
        if (!options.fields)
            options.fields = '*';
        let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
        sql += ` WHERE id IN (${this.escapeIdsForSql(ids)})`;
        const q = this.applySqlOptions(options, sql);
        return this.modelSelectAll(q.sql);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async search(options = null) {
        if (!options)
            options = {};
        if (!options.fields)
            options.fields = '*';
        const conditions = options.conditions ? options.conditions.slice(0) : [];
        const params = options.conditionsParams ? options.conditionsParams.slice(0) : [];
        if (options.titlePattern) {
            const pattern = options.titlePattern.replace(/\*/g, '%');
            conditions.push('title LIKE ?');
            params.push(pattern);
        }
        if ('limit' in options && options.limit <= 0)
            return [];
        let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
        if (conditions.length)
            sql += ` WHERE ${conditions.join(' AND ')}`;
        const query = this.applySqlOptions(options, sql, params);
        return this.modelSelectAll(query.sql, query.params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async modelSelectOne(sqlOrSqlQuery, params = null) {
        if (params === null)
            params = [];
        let sql = '';
        if (typeof sqlOrSqlQuery !== 'string') {
            sql = sqlOrSqlQuery.sql;
            params = sqlOrSqlQuery.params ? sqlOrSqlQuery.params : [];
        }
        else {
            sql = sqlOrSqlQuery;
        }
        try {
            const model = await this.db().selectOne(sql, params);
            return this.filter(this.addModelMd(model));
        }
        catch (error) {
            error.message = `On query ${JSON.stringify({ sql, params })}: ${error.message}`;
            throw error;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async modelSelectAll(sqlOrSqlQuery, params = null) {
        if (params === null)
            params = [];
        let sql = '';
        if (typeof sqlOrSqlQuery !== 'string') {
            sql = sqlOrSqlQuery.sql;
            params = sqlOrSqlQuery.params ? sqlOrSqlQuery.params : [];
        }
        else {
            sql = sqlOrSqlQuery;
        }
        try {
            const models = await this.db().selectAll(sql, params);
            return this.filterArray(this.addModelMd(models));
        }
        catch (error) {
            error.message = `On query ${JSON.stringify({ sql, params })}: ${error.message}`;
            throw error;
        }
    }
    static selectFields(options) {
        if (!options || !options.fields)
            return '*';
        return this.db().escapeFieldsToString(options.fields);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static loadByField(fieldName, fieldValue, options = null) {
        if (!options)
            options = {};
        if (!('caseInsensitive' in options))
            options.caseInsensitive = false;
        if (!options.fields)
            options.fields = '*';
        let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\` WHERE \`${fieldName}\` = ?`;
        if (options.caseInsensitive)
            sql += ' COLLATE NOCASE';
        return this.modelSelectOne(sql, [fieldValue]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static loadByFields(fields, options = null) {
        if (!options)
            options = {};
        if (!('caseInsensitive' in options))
            options.caseInsensitive = false;
        if (!options.fields)
            options.fields = '*';
        const whereSql = [];
        const params = [];
        for (const fieldName in fields) {
            whereSql.push(`\`${fieldName}\` = ?`);
            params.push(fields[fieldName]);
        }
        let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\` WHERE ${whereSql.join(' AND ')}`;
        if (options.caseInsensitive)
            sql += ' COLLATE NOCASE';
        return this.modelSelectOne(sql, params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static loadByTitle(fieldValue) {
        return this.modelSelectOne(`SELECT * FROM \`${this.tableName()}\` WHERE \`title\` = ?`, [fieldValue]);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static diffObjects(oldModel, newModel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = {};
        const fields = this.diffObjectsFields(oldModel, newModel);
        for (let i = 0; i < fields.length; i++) {
            output[fields[i]] = newModel[fields[i]];
        }
        if ('type_' in newModel)
            output.type_ = newModel.type_;
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static diffObjectsFields(oldModel, newModel) {
        const output = [];
        for (const n in newModel) {
            if (!newModel.hasOwnProperty(n))
                continue;
            if (n === 'type_')
                continue;
            if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
                output.push(n);
            }
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static modelsAreSame(oldModel, newModel) {
        const diff = this.diffObjects(oldModel, newModel);
        delete diff.type_;
        return !Object.getOwnPropertyNames(diff).length;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static saveMutex(modelOrId) {
        const noLockMutex = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            acquire: function () {
                return null;
            },
        };
        if (!modelOrId)
            return noLockMutex;
        const modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;
        if (!modelId)
            return noLockMutex;
        let mutex = BaseModel.saveMutexes_[modelId];
        if (mutex)
            return mutex;
        mutex = new Mutex();
        BaseModel.saveMutexes_[modelId] = mutex;
        return mutex;
    }
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
    static releaseSaveMutex(modelOrId, release) {
        if (!release)
            return;
        if (!modelOrId)
            return release();
        const modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;
        if (!modelId)
            return release();
        const mutex = BaseModel.saveMutexes_[modelId];
        if (!mutex)
            return release();
        delete BaseModel.saveMutexes_[modelId];
        release();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static saveQuery(o, options) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let temp = {};
        const fieldNames = this.fieldNames();
        for (let i = 0; i < fieldNames.length; i++) {
            const n = fieldNames[i];
            if (n in o)
                temp[n] = o[n];
        }
        // Remove fields that are not in the `fields` list, if provided.
        // Note that things like update_time, user_updated_time will still
        // be part of the final list of fields if autoTimestamp is on.
        // id also will stay.
        if (!options.isNew && options.fields) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const filtered = {};
            for (const k in temp) {
                if (!temp.hasOwnProperty(k))
                    continue;
                if (k !== 'id' && options.fields.indexOf(k) < 0)
                    continue;
                filtered[k] = temp[k];
            }
            temp = filtered;
        }
        o = temp;
        let modelId = temp.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let query = {};
        const timeNow = time_1.default.unixMs();
        if (options.autoTimestamp && this.hasField('updated_time')) {
            o.updated_time = timeNow;
        }
        // The purpose of user_updated_time is to allow the user to manually set the time of a note (in which case
        // options.autoTimestamp will be `false`). However note that if the item is later changed, this timestamp
        // will be set again to the current time.
        //
        // The technique to modify user_updated_time while keeping updated_time current (so that sync can happen) is to
        // manually set updated_time when saving and to set autoTimestamp to false, for example:
        // Note.save({ id: "...", updated_time: Date.now(), user_updated_time: 1436342618000 }, { autoTimestamp: false })
        if (options.autoTimestamp && this.hasField('user_updated_time')) {
            o.user_updated_time = timeNow;
        }
        if (options.isNew) {
            if (this.useUuid() && !o.id) {
                modelId = this.generateUuid();
                o.id = modelId;
            }
            if (!o.created_time && this.hasField('created_time')) {
                o.created_time = timeNow;
            }
            if (!o.user_created_time && this.hasField('user_created_time')) {
                o.user_created_time = o.created_time ? o.created_time : timeNow;
            }
            if (!o.user_updated_time && this.hasField('user_updated_time')) {
                o.user_updated_time = o.updated_time ? o.updated_time : timeNow;
            }
            query = database_1.default.insertQuery(this.tableName(), o);
        }
        else {
            const where = { id: o.id };
            const temp = Object.assign({}, o);
            delete temp.id;
            query = database_1.default.updateQuery(this.tableName(), temp, where);
        }
        query.id = modelId;
        query.modObject = o;
        return query;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static userSideValidation(o) {
        if (o.id && !o.id.match(/^[a-f0-9]{32}$/)) {
            throw new Error('Validation error: ID must a 32-characters lowercase hexadecimal string');
        }
        const timestamps = ['user_updated_time', 'user_created_time'];
        for (const k of timestamps) {
            if ((k in o) && (typeof o[k] !== 'number' || isNaN(o[k]) || o[k] < 0))
                throw new Error('Validation error: user_updated_time and user_created_time must be numbers greater than 0');
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async save(o, options = null) {
        // When saving, there's a mutex per model ID. This is because the model returned from this function
        // is basically its input `o` (instead of being read from the database, for performance reasons).
        // This works well in general except if that model is saved simultaneously in two places. In that
        // case, the output won't be up-to-date and would cause for example display issues with out-dated
        // notes being displayed. This was an issue when notes were being synchronised while being decrypted
        // at the same time.
        const mutexRelease = await this.saveMutex(o).acquire();
        options = this.modOptions(options);
        const isNew = this.isNew(o, options);
        options.isNew = isNew;
        // Diff saving is an optimisation which takes a new version of the item and an old one,
        // do a diff and save only this diff. IMPORTANT: When using this make sure that both
        // models have been normalised using ItemClass.filter()
        const isDiffSaving = options && options.oldItem && !options.isNew;
        if (isDiffSaving) {
            const newObject = BaseModel.diffObjects(options.oldItem, o);
            newObject.type_ = o.type_;
            newObject.id = o.id;
            o = newObject;
        }
        o = this.filter(o);
        if (options.userSideValidation) {
            this.userSideValidation(o);
        }
        let queries = [];
        const saveQuery = this.saveQuery(o, options);
        const modelId = saveQuery.id;
        queries.push(saveQuery);
        if (options.nextQueries && options.nextQueries.length) {
            queries = queries.concat(options.nextQueries);
        }
        let output = null;
        try {
            await this.db().transactionExecBatch(queries);
            o = Object.assign({}, o);
            if (modelId)
                o.id = modelId;
            if ('updated_time' in saveQuery.modObject)
                o.updated_time = saveQuery.modObject.updated_time;
            if ('created_time' in saveQuery.modObject)
                o.created_time = saveQuery.modObject.created_time;
            if ('user_updated_time' in saveQuery.modObject)
                o.user_updated_time = saveQuery.modObject.user_updated_time;
            if ('user_created_time' in saveQuery.modObject)
                o.user_created_time = saveQuery.modObject.user_created_time;
            o = this.addModelMd(o);
            if (isDiffSaving) {
                for (const n in options.oldItem) {
                    if (!options.oldItem.hasOwnProperty(n))
                        continue;
                    if (n in o)
                        continue;
                    o[n] = options.oldItem[n];
                }
            }
            output = this.filter(o);
        }
        finally {
            this.releaseSaveMutex(o, mutexRelease);
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static isNew(object, options) {
        if (options && 'isNew' in options) {
            // options.isNew can be "auto" too
            if (options.isNew === true)
                return true;
            if (options.isNew === false)
                return false;
        }
        return !object.id;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static filterArray(models) {
        const output = [];
        for (let i = 0; i < models.length; i++) {
            output.push(this.filter(models[i]));
        }
        return output;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static filter(model) {
        if (!model)
            return model;
        const output = Object.assign({}, model);
        for (const n in output) {
            if (!output.hasOwnProperty(n))
                continue;
            // The SQLite database doesn't have booleans so cast everything to int
            if (output[n] === true) {
                output[n] = 1;
            }
            else if (output[n] === false) {
                output[n] = 0;
            }
            else {
                const t = this.fieldType(n, database_1.default.TYPE_UNKNOWN);
                if (t === database_1.default.TYPE_INT) {
                    output[n] = !n ? 0 : parseInt(output[n], 10);
                }
            }
        }
        return output;
    }
    static delete(id, options) {
        if (!id)
            throw new Error('Cannot delete object without an ID');
        ActionLogger_1.default.from(options === null || options === void 0 ? void 0 : options.sourceDescription).log(ActionLogger_1.ItemActionType.Delete, id);
        return this.db().exec(`DELETE FROM ${this.tableName()} WHERE id = ?`, [id]);
    }
    static async batchDelete(ids, options) {
        if (!ids.length)
            return;
        ActionLogger_1.default.from(options === null || options === void 0 ? void 0 : options.sourceDescription).log(ActionLogger_1.ItemActionType.Delete, ids);
        options = this.modOptions(options);
        const idFieldName = options.idFieldName ? options.idFieldName : 'id';
        const sql = `DELETE FROM ${this.tableName()} WHERE ${idFieldName} IN (${this.escapeIdsForSql(ids)})`;
        await this.db().exec(sql);
    }
    static db() {
        if (!this.db_)
            throw new Error('Accessing database before it has been initialised');
        return this.db_;
    }
    static generateUuid() {
        return this.uuidGenerator();
    }
    static setIdGenerator(generator) {
        const previous = this.uuidGenerator;
        this.uuidGenerator = generator;
        return previous;
    }
}
// TODO: This ancient part of Joplin about model types is a bit of a
// mess and should be refactored properly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
BaseModel.typeEnum_ = [
    ['TYPE_NOTE', ModelType.Note],
    ['TYPE_FOLDER', ModelType.Folder],
    ['TYPE_SETTING', ModelType.Setting],
    ['TYPE_RESOURCE', ModelType.Resource],
    ['TYPE_TAG', ModelType.Tag],
    ['TYPE_NOTE_TAG', ModelType.NoteTag],
    ['TYPE_SEARCH', ModelType.Search],
    ['TYPE_ALARM', ModelType.Alarm],
    ['TYPE_MASTER_KEY', ModelType.MasterKey],
    ['TYPE_ITEM_CHANGE', ModelType.ItemChange],
    ['TYPE_NOTE_RESOURCE', ModelType.NoteResource],
    ['TYPE_RESOURCE_LOCAL_STATE', ModelType.ResourceLocalState],
    ['TYPE_REVISION', ModelType.Revision],
    ['TYPE_MIGRATION', ModelType.Migration],
    ['TYPE_SMART_FILTER', ModelType.SmartFilter],
    ['TYPE_COMMAND', ModelType.Command],
];
BaseModel.uuidGenerator = uuid_1.default.create;
BaseModel.TYPE_NOTE = ModelType.Note;
BaseModel.TYPE_FOLDER = ModelType.Folder;
BaseModel.TYPE_SETTING = ModelType.Setting;
BaseModel.TYPE_RESOURCE = ModelType.Resource;
BaseModel.TYPE_TAG = ModelType.Tag;
BaseModel.TYPE_NOTE_TAG = ModelType.NoteTag;
BaseModel.TYPE_SEARCH = ModelType.Search;
BaseModel.TYPE_ALARM = ModelType.Alarm;
BaseModel.TYPE_MASTER_KEY = ModelType.MasterKey;
BaseModel.TYPE_ITEM_CHANGE = ModelType.ItemChange;
BaseModel.TYPE_NOTE_RESOURCE = ModelType.NoteResource;
BaseModel.TYPE_RESOURCE_LOCAL_STATE = ModelType.ResourceLocalState;
BaseModel.TYPE_REVISION = ModelType.Revision;
BaseModel.TYPE_MIGRATION = ModelType.Migration;
BaseModel.TYPE_SMART_FILTER = ModelType.SmartFilter;
BaseModel.TYPE_COMMAND = ModelType.Command;
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
BaseModel.dispatch = function () { };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
BaseModel.saveMutexes_ = {};
for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
    const e = BaseModel.typeEnum_[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    BaseModel[e[0]] = e[1];
}
exports.default = BaseModel;
