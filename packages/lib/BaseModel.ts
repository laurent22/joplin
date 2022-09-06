import paginationToSql from './models/utils/paginationToSql';

import Database from './database';
import uuid from './uuid';
import time from './time';
import JoplinDatabase, { TableField } from './JoplinDatabase';
const Mutex = require('async-mutex').Mutex;

// New code should make use of this enum
export enum ModelType {
	Note = 1,
	Folder = 2,
	Setting = 3,
	Resource = 4,
	Tag = 5,
	NoteTag = 6,
	Search = 7,
	Alarm = 8,
	MasterKey = 9,
	ItemChange = 10,
	NoteResource = 11,
	ResourceLocalState = 12,
	Revision = 13,
	Migration = 14,
	SmartFilter = 15,
	Command = 16,
}

export interface DeleteOptions {
	idFieldName?: string;
	changeSource?: number;
	deleteChildren?: boolean;

	// By default the application tracks item deletions, so that they can be
	// applied to the remote items during synchronisation. However, in some
	// cases, we don't want this. In particular when an item is deleted via
	// sync, we don't need to track the deletion, because the operation doesn't
	// need to applied again on next sync.
	trackDeleted?: boolean;
}

class BaseModel {

	// TODO: This ancient part of Joplin about model types is a bit of a
	// mess and should be refactored properly.

	public static typeEnum_: any[] = [
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

	public static TYPE_NOTE = ModelType.Note;
	public static TYPE_FOLDER = ModelType.Folder;
	public static TYPE_SETTING = ModelType.Setting;
	public static TYPE_RESOURCE = ModelType.Resource;
	public static TYPE_TAG = ModelType.Tag;
	public static TYPE_NOTE_TAG = ModelType.NoteTag;
	public static TYPE_SEARCH = ModelType.Search;
	public static TYPE_ALARM = ModelType.Alarm;
	public static TYPE_MASTER_KEY = ModelType.MasterKey;
	public static TYPE_ITEM_CHANGE = ModelType.ItemChange;
	public static TYPE_NOTE_RESOURCE = ModelType.NoteResource;
	public static TYPE_RESOURCE_LOCAL_STATE = ModelType.ResourceLocalState;
	public static TYPE_REVISION = ModelType.Revision;
	public static TYPE_MIGRATION = ModelType.Migration;
	public static TYPE_SMART_FILTER = ModelType.SmartFilter;
	public static TYPE_COMMAND = ModelType.Command;

	public static dispatch: Function = function() {};
	private static saveMutexes_: any = {};

	private static db_: JoplinDatabase;

	static modelType(): ModelType {
		throw new Error('Must be overriden');
	}

	static tableName(): string {
		throw new Error('Must be overriden');
	}

	static setDb(db: any) {
		this.db_ = db;
	}

	static addModelMd(model: any): any {
		if (!model) return model;

		if (Array.isArray(model)) {
			const output = [];
			for (let i = 0; i < model.length; i++) {
				output.push(this.addModelMd(model[i]));
			}
			return output;
		} else {
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

	static byId(items: any[], id: string) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id === id) return items[i];
		}
		return null;
	}

	static defaultValues(fieldNames: string[]) {
		const output: any = {};
		for (const n of fieldNames) {
			output[n] = this.db().fieldDefaultValue(this.tableName(), n);
		}
		return output;
	}

	static modelIndexById(items: any[], id: string) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id === id) return i;
		}
		return -1;
	}

	static modelsByIds(items: any[], ids: string[]) {
		const output = [];
		for (let i = 0; i < items.length; i++) {
			if (ids.indexOf(items[i].id) >= 0) {
				output.push(items[i]);
			}
		}
		return output;
	}

	// Prefer the use of this function to compare IDs as it handles the case where
	// one ID is null and the other is "", in which case they are actually considered to be the same.
	static idsEqual(id1: string, id2: string) {
		if (!id1 && !id2) return true;
		if (!id1 && !!id2) return false;
		if (!!id1 && !id2) return false;
		return id1 === id2;
	}

	static modelTypeToName(type: number) {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			if (e[1] === type) return e[0].substr(5).toLowerCase();
		}
		throw new Error(`Unknown model type: ${type}`);
	}

	static modelNameToType(name: string) {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			const eName = e[0].substr(5).toLowerCase();
			if (eName === name) return e[1];
		}
		throw new Error(`Unknown model name: ${name}`);
	}

	static hasField(name: string) {
		const fields = this.fieldNames();
		return fields.indexOf(name) >= 0;
	}

	static fieldNames(withPrefix: boolean = false) {
		const output = this.db().tableFieldNames(this.tableName());
		if (!withPrefix) return output;

		const p = withPrefix === true ? this.tableName() : withPrefix;
		const temp = [];
		for (let i = 0; i < output.length; i++) {
			temp.push(`${p}.${output[i]}`);
		}

		return temp;
	}

	static fieldType(name: string, defaultValue: any = null) {
		const fields = this.fields();
		for (let i = 0; i < fields.length; i++) {
			if (fields[i].name === name) return fields[i].type;
		}
		if (defaultValue !== null) return defaultValue;
		throw new Error(`Unknown field: ${name}`);
	}

	static fields(): TableField[] {
		return this.db().tableFields(this.tableName());
	}

	static removeUnknownFields(model: any) {
		const newModel: any = {};
		for (const n in model) {
			if (!model.hasOwnProperty(n)) continue;
			if (!this.hasField(n) && n !== 'type_') continue;
			newModel[n] = model[n];
		}
		return newModel;
	}

	static new() {
		const fields = this.fields();
		const output: any = {};
		for (let i = 0; i < fields.length; i++) {
			const f = fields[i];
			output[f.name] = f.default;
		}
		return output;
	}

	static modOptions(options: any) {
		if (!options) {
			options = {};
		} else {
			options = Object.assign({}, options);
		}
		if (!('isNew' in options)) options.isNew = 'auto';
		if (!('autoTimestamp' in options)) options.autoTimestamp = true;
		if (!('userSideValidation' in options)) options.userSideValidation = false;
		return options;
	}

	static count(options: any = null) {
		if (!options) options = {};
		let sql = `SELECT count(*) as total FROM \`${this.tableName()}\``;
		if (options.where) sql += ` WHERE ${options.where}`;
		return this.db()
			.selectOne(sql)
			.then((r: any) => {
				return r ? r['total'] : 0;
			});
	}

	static load(id: string, options: any = null) {
		return this.loadByField('id', id, options);
	}

	static shortId(id: string) {
		return id.substr(0, 5);
	}

	static loadByPartialId(partialId: string) {
		return this.modelSelectAll(`SELECT * FROM \`${this.tableName()}\` WHERE \`id\` LIKE ?`, [`${partialId}%`]);
	}

	static applySqlOptions(options: any, sql: string, params: any[] = null) {
		if (!options) options = {};

		if (options.order && options.order.length) {
			sql += ` ORDER BY ${paginationToSql(options)}`;
		}

		if (options.limit) sql += ` LIMIT ${options.limit}`;

		return { sql: sql, params: params };
	}

	static async allIds(options: any = null) {
		const q = this.applySqlOptions(options, `SELECT id FROM \`${this.tableName()}\``);
		const rows = await this.db().selectAll(q.sql, q.params);
		return rows.map((r: any) => r.id);
	}

	static async all(options: any = null) {
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
		let params: any[] = [];
		if (options.where) {
			sql += ` WHERE ${options.where}`;
			if (options.whereParams) params = params.concat(options.whereParams);
		}

		const q = this.applySqlOptions(options, sql, params);
		return this.modelSelectAll(q.sql, q.params);
	}

	static async byIds(ids: string[], options: any = null) {
		if (!ids.length) return [];
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
		sql += ` WHERE id IN ("${ids.join('","')}")`;
		const q = this.applySqlOptions(options, sql);
		return this.modelSelectAll(q.sql);
	}

	static async search(options: any = null) {
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		const conditions = options.conditions ? options.conditions.slice(0) : [];
		const params = options.conditionsParams ? options.conditionsParams.slice(0) : [];

		if (options.titlePattern) {
			const pattern = options.titlePattern.replace(/\*/g, '%');
			conditions.push('title LIKE ?');
			params.push(pattern);
		}

		if ('limit' in options && options.limit <= 0) return [];

		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
		if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;

		const query = this.applySqlOptions(options, sql, params);
		return this.modelSelectAll(query.sql, query.params);
	}

	static modelSelectOne(sql: string, params: any[] = null) {
		if (params === null) params = [];
		return this.db()
			.selectOne(sql, params)
			.then((model: any) => {
				return this.filter(this.addModelMd(model));
			});
	}

	static modelSelectAll(sql: string, params: any[] = null) {
		if (params === null) params = [];
		return this.db()
			.selectAll(sql, params)
			.then((models: any[]) => {
				return this.filterArray(this.addModelMd(models));
			});
	}

	static loadByField(fieldName: string, fieldValue: any, options: any = null) {
		if (!options) options = {};
		if (!('caseInsensitive' in options)) options.caseInsensitive = false;
		if (!options.fields) options.fields = '*';
		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\` WHERE \`${fieldName}\` = ?`;
		if (options.caseInsensitive) sql += ' COLLATE NOCASE';
		return this.modelSelectOne(sql, [fieldValue]);
	}

	static loadByFields(fields: any, options: any = null) {
		if (!options) options = {};
		if (!('caseInsensitive' in options)) options.caseInsensitive = false;
		if (!options.fields) options.fields = '*';
		const whereSql = [];
		const params = [];
		for (const fieldName in fields) {
			whereSql.push(`\`${fieldName}\` = ?`);
			params.push(fields[fieldName]);
		}
		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\` WHERE ${whereSql.join(' AND ')}`;
		if (options.caseInsensitive) sql += ' COLLATE NOCASE';
		return this.modelSelectOne(sql, params);
	}

	static loadByTitle(fieldValue: any) {
		return this.modelSelectOne(`SELECT * FROM \`${this.tableName()}\` WHERE \`title\` = ?`, [fieldValue]);
	}

	static diffObjects(oldModel: any, newModel: any) {
		const output: any = {};
		const fields = this.diffObjectsFields(oldModel, newModel);
		for (let i = 0; i < fields.length; i++) {
			output[fields[i]] = newModel[fields[i]];
		}
		if ('type_' in newModel) output.type_ = newModel.type_;
		return output;
	}

	static diffObjectsFields(oldModel: any, newModel: any) {
		const output = [];
		for (const n in newModel) {
			if (!newModel.hasOwnProperty(n)) continue;
			if (n === 'type_') continue;
			if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
				output.push(n);
			}
		}
		return output;
	}

	static modelsAreSame(oldModel: any, newModel: any) {
		const diff = this.diffObjects(oldModel, newModel);
		delete diff.type_;
		return !Object.getOwnPropertyNames(diff).length;
	}

	static saveMutex(modelOrId: any) {
		const noLockMutex = {
			acquire: function(): any {
				return null;
			},
		};

		if (!modelOrId) return noLockMutex;

		const modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;

		if (!modelId) return noLockMutex;

		let mutex = BaseModel.saveMutexes_[modelId];
		if (mutex) return mutex;

		mutex = new Mutex();
		BaseModel.saveMutexes_[modelId] = mutex;
		return mutex;
	}

	static releaseSaveMutex(modelOrId: any, release: Function) {
		if (!release) return;
		if (!modelOrId) return release();

		const modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;

		if (!modelId) return release();

		const mutex = BaseModel.saveMutexes_[modelId];
		if (!mutex) return release();

		delete BaseModel.saveMutexes_[modelId];
		release();
	}

	static saveQuery(o: any, options: any) {
		let temp: any = {};
		const fieldNames = this.fieldNames();
		for (let i = 0; i < fieldNames.length; i++) {
			const n = fieldNames[i];
			if (n in o) temp[n] = o[n];
		}

		// Remove fields that are not in the `fields` list, if provided.
		// Note that things like update_time, user_updated_time will still
		// be part of the final list of fields if autoTimestamp is on.
		// id also will stay.
		if (!options.isNew && options.fields) {
			const filtered: any = {};
			for (const k in temp) {
				if (!temp.hasOwnProperty(k)) continue;
				if (k !== 'id' && options.fields.indexOf(k) < 0) continue;
				filtered[k] = temp[k];
			}
			temp = filtered;
		}

		o = temp;

		let modelId = temp.id;
		let query: any = {};

		const timeNow = time.unixMs();

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
				modelId = uuid.create();
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

			query = Database.insertQuery(this.tableName(), o);
		} else {
			const where = { id: o.id };
			const temp = Object.assign({}, o);
			delete temp.id;

			query = Database.updateQuery(this.tableName(), temp, where);
		}

		query.id = modelId;
		query.modObject = o;

		return query;
	}

	static userSideValidation(o: any) {
		if (o.id && !o.id.match(/^[a-f0-9]{32}$/)) {
			throw new Error('Validation error: ID must a 32-characters lowercase hexadecimal string');
		}

		const timestamps = ['user_updated_time', 'user_created_time'];
		for (const k of timestamps) {
			if ((k in o) && (typeof o[k] !== 'number' || isNaN(o[k]) || o[k] < 0)) throw new Error('Validation error: user_updated_time and user_created_time must be numbers greater than 0');
		}
	}

	static async save(o: any, options: any = null) {
		// When saving, there's a mutex per model ID. This is because the model returned from this function
		// is basically its input `o` (instead of being read from the database, for performance reasons).
		// This works well in general except if that model is saved simultaneously in two places. In that
		// case, the output won't be up-to-date and would cause for example display issues with out-dated
		// notes being displayed. This was an issue when notes were being synchronised while being decrypted
		// at the same time.

		const mutexRelease = await this.saveMutex(o).acquire();

		options = this.modOptions(options);
		options.isNew = this.isNew(o, options);

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
			if (modelId) o.id = modelId;
			if ('updated_time' in saveQuery.modObject) o.updated_time = saveQuery.modObject.updated_time;
			if ('created_time' in saveQuery.modObject) o.created_time = saveQuery.modObject.created_time;
			if ('user_updated_time' in saveQuery.modObject) o.user_updated_time = saveQuery.modObject.user_updated_time;
			if ('user_created_time' in saveQuery.modObject) o.user_created_time = saveQuery.modObject.user_created_time;
			o = this.addModelMd(o);

			if (isDiffSaving) {
				for (const n in options.oldItem) {
					if (!options.oldItem.hasOwnProperty(n)) continue;
					if (n in o) continue;
					o[n] = options.oldItem[n];
				}
			}

			output = this.filter(o);
		} finally {
			this.releaseSaveMutex(o, mutexRelease);
		}

		return output;
	}

	static isNew(object: any, options: any) {
		if (options && 'isNew' in options) {
			// options.isNew can be "auto" too
			if (options.isNew === true) return true;
			if (options.isNew === false) return false;
		}

		return !object.id;
	}

	static filterArray(models: any[]) {
		const output = [];
		for (let i = 0; i < models.length; i++) {
			output.push(this.filter(models[i]));
		}
		return output;
	}

	static filter(model: any) {
		if (!model) return model;

		const output = Object.assign({}, model);
		for (const n in output) {
			if (!output.hasOwnProperty(n)) continue;

			// The SQLite database doesn't have booleans so cast everything to int
			if (output[n] === true) {
				output[n] = 1;
			} else if (output[n] === false) {
				output[n] = 0;
			} else {
				const t = this.fieldType(n, Database.TYPE_UNKNOWN);
				if (t === Database.TYPE_INT) {
					output[n] = !n ? 0 : parseInt(output[n], 10);
				}
			}
		}

		return output;
	}

	static delete(id: string) {
		if (!id) throw new Error('Cannot delete object without an ID');
		return this.db().exec(`DELETE FROM ${this.tableName()} WHERE id = ?`, [id]);
	}

	static async batchDelete(ids: string[], options: DeleteOptions = null) {
		if (!ids.length) return;
		options = this.modOptions(options);
		const idFieldName = options.idFieldName ? options.idFieldName : 'id';
		const sql = `DELETE FROM ${this.tableName()} WHERE ${idFieldName} IN ("${ids.join('","')}")`;
		await this.db().exec(sql);
	}

	static db() {
		if (!this.db_) throw new Error('Accessing database before it has been initialised');
		return this.db_;
	}

	// static isReady() {
	// 	return !!this.db_;
	// }
}

for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
	const e = BaseModel.typeEnum_[i];
	(BaseModel as any)[e[0]] = e[1];
}

export default BaseModel;
