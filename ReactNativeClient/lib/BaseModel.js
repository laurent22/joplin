const { Log } = require('lib/log.js');
const { Database } = require('lib/database.js');
const { uuid } = require('lib/uuid.js');
const { time } = require('lib/time-utils.js');
const Mutex = require('async-mutex').Mutex;

class BaseModel {

	static modelType() {
		throw new Error('Must be overriden');
	}

	static tableName() {
		throw new Error('Must be overriden');
	}

	static addModelMd(model) {
		if (!model) return model;
		
		if (Array.isArray(model)) {
			let output = [];
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

	static byId(items, id) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id == id) return items[i];
		}
		return null;
	}

	static modelTypeToName(type) {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			if (e[1] === type) return e[0].substr(5).toLowerCase();
		}
		throw new Error('Unknown model type: ' + type);
	}

	static hasField(name) {
		let fields = this.fieldNames();
		return fields.indexOf(name) >= 0;
	}

	static fieldNames(withPrefix = false) {
		let output = this.db().tableFieldNames(this.tableName());
		if (!withPrefix) return output;

		let p = withPrefix === true ? this.tableName() : withPrefix;
		let temp = [];
		for (let i = 0; i < output.length; i++) {
			temp.push(p + '.' + output[i]);
		}

		return temp;
	}

	static fieldType(name, defaultValue = null) {
		let fields = this.fields();
		for (let i = 0; i < fields.length; i++) {
			if (fields[i].name == name) return fields[i].type;
		}
		if (defaultValue !== null) return defaultValue;
		throw new Error('Unknown field: ' + name);
	}

	static fields() {
		return this.db().tableFields(this.tableName());
	}

	static new() {
		let fields = this.fields();
		let output = {};
		for (let i = 0; i < fields.length; i++) {
			let f = fields[i];
			output[f.name] = f.default;
		}
		return output;
	}

	static modOptions(options) {
		if (!options) {
			options = {};
		} else {
			options = Object.assign({}, options);
		}
		if (!('isNew' in options)) options.isNew = 'auto';
		if (!('autoTimestamp' in options)) options.autoTimestamp = true;
		return options;
	}

	static count(options = null) {
		if (!options) options = {};
		let sql = 'SELECT count(*) as total FROM `' + this.tableName() + '`';
		if (options.where) sql += ' WHERE ' + options.where;
		return this.db().selectOne(sql).then((r) => {
			return r ? r['total'] : 0;
		});
	}

	static load(id) {
		return this.loadByField('id', id);
	}

	static shortId(id) {
		return id.substr(0, 5);
	}

	// static minimalPartialId(id) {
	// 	let length = 2;
	// 	while (true) {
	// 		const partialId = id.substr(0, length);
	// 		const r = await this.db().selectOne('SELECT count(*) as total FROM `' + this.tableName() + '` WHERE `id` LIKE ?', [partialId + '%']);
	// 		if (r['total'] <= 1) return partialId;
	// 	}
	// }

	static loadByPartialId(partialId) {
		return this.modelSelectAll('SELECT * FROM `' + this.tableName() + '` WHERE `id` LIKE ?', [partialId + '%']);
	}

	static applySqlOptions(options, sql, params = null) {
		if (!options) options = {};

		if (options.order && options.order.length) {
			let items = [];
			for (let i = 0; i < options.order.length; i++) {
				const o = options.order[i];
				let item = o.by;
				if (options.caseInsensitive === true) item += ' COLLATE NOCASE';
				if (o.dir) item += ' ' + o.dir;
				items.push(item);
			}
			sql += ' ORDER BY ' + items.join(', ');
		}
		
		if (options.limit) sql += ' LIMIT ' + options.limit;

		return { sql: sql, params: params };
	}

	static async allIds(options = null) {
		let q = this.applySqlOptions(options, 'SELECT id FROM `' + this.tableName() + '`');
		const rows = await this.db().selectAll(q.sql, q.params);
		return rows.map((r) => r.id);
	}

	static async all(options = null) {
		let q = this.applySqlOptions(options, 'SELECT * FROM `' + this.tableName() + '`');
		return this.modelSelectAll(q.sql);
	}

	static async search(options = null) {
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		let conditions = options.conditions ? options.conditions.slice(0) : [];
		let params = options.conditionsParams ? options.conditionsParams.slice(0) : [];

		if (options.titlePattern) {
			let pattern = options.titlePattern.replace(/\*/g, '%');
			conditions.push('title LIKE ?');
			params.push(pattern);
		}

		if ('limit' in options && options.limit <= 0) return [];

		let sql = 'SELECT ' + this.db().escapeFields(options.fields) + ' FROM `' + this.tableName() + '`';
		if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

		let query = this.applySqlOptions(options, sql, params);
		return this.modelSelectAll(query.sql, query.params);
	}

	static modelSelectOne(sql, params = null) {
		if (params === null) params = [];
		return this.db().selectOne(sql, params).then((model) => {
			return this.filter(this.addModelMd(model));
		});
	}

	static modelSelectAll(sql, params = null) {
		if (params === null) params = [];
		return this.db().selectAll(sql, params).then((models) => {
			return this.filterArray(this.addModelMd(models));
		});
	}

	static loadByField(fieldName, fieldValue, options = null) {
		if (!options) options = {};
		if (!('caseInsensitive' in options)) options.caseInsensitive = false;
		let sql = 'SELECT * FROM `' + this.tableName() + '` WHERE `' + fieldName + '` = ?';
		if (options.caseInsensitive) sql += ' COLLATE NOCASE';
		return this.modelSelectOne(sql, [fieldValue]);
	}

	static loadByTitle(fieldValue) {
		return this.modelSelectOne('SELECT * FROM `' + this.tableName() + '` WHERE `title` = ?', [fieldValue]);
	}

	static diffObjects(oldModel, newModel) {
		let output = {};
		const fields = this.diffObjectsFields(oldModel, newModel);
		for (let i = 0; i < fields.length; i++) {
			output[fields[i]] = newModel[fields[i]];
		}
		if ('type_' in newModel) output.type_ = newModel.type_;
		return output;
		// let output = {};
		// let type = null;
		// for (let n in newModel) {
		// 	if (!newModel.hasOwnProperty(n)) continue;
		// 	if (n == 'type_') {
		// 		type = newModel[n];
		// 		continue;
		// 	}
		// 	if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
		// 		output[n] = newModel[n];
		// 	}
		// }
		// if (type !== null) output.type_ = type;
		// return output;
	}

	static diffObjectsFields(oldModel, newModel) {
		let output = [];
		for (let n in newModel) {
			if (!newModel.hasOwnProperty(n)) continue;
			if (n == 'type_') continue;
			if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
				output.push(n);
			}
		}
		return output;
	}

	static modelsAreSame(oldModel, newModel) {
		const diff = this.diffObjects(oldModel, newModel);
		delete diff.type_;
		return !Object.getOwnPropertyNames(diff).length;
	}

	static saveMutex(modelOrId) {
		const noLockMutex = {
			acquire: function() { return null; }
		};

		if (!modelOrId) return noLockMutex;

		let modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;

		if (!modelId) return noLockMutex;

		let mutex = BaseModel.saveMutexes_[modelId];
		if (mutex) return mutex;

		mutex = new Mutex();
		BaseModel.saveMutexes_[modelId] = mutex;
		return mutex;
	}

	static releaseSaveMutex(modelOrId, release) {
		if (!release) return;
		if (!modelOrId) return release();

		let modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;

		if (!modelId) return release();

		let mutex = BaseModel.saveMutexes_[modelId];
		if (!mutex) return release();

		delete BaseModel.saveMutexes_[modelId];
		release();
	}

	static saveQuery(o, options) {
		let temp = {}
		let fieldNames = this.fieldNames();
		for (let i = 0; i < fieldNames.length; i++) {
			let n = fieldNames[i];
			if (n in o) temp[n] = o[n];
		}

		// Remove fields that are not in the `fields` list, if provided.
		// Note that things like update_time, user_update_time will still
		// be part of the final list of fields if autoTimestamp is on.
		// id also will stay.
		if (!options.isNew && options.fields) {
			const filtered = {};
			for (let k in temp) {
				if (!temp.hasOwnProperty(k)) continue;
				if (k !== 'id' && options.fields.indexOf(k) < 0) continue;
				filtered[k] = temp[k];
			}
			temp = filtered;
		}

		o = temp;

		let modelId = temp.id;
		let query = {};

		const timeNow = time.unixMs();

		if (options.autoTimestamp && this.hasField('updated_time')) {
			o.updated_time = timeNow;
		}

		// The purpose of user_updated_time is to allow the user to manually set the time of a note (in which case
		// options.autoTimestamp will be `false`). However note that if the item is later changed, this timestamp
		// will be set again to the current time.
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
			let where = { id: o.id };
			let temp = Object.assign({}, o);
			delete temp.id;

			query = Database.updateQuery(this.tableName(), temp, where);
		}

		query.id = modelId;
		query.modObject = o;

		return query;
	}

	static async save(o, options = null) {
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

		let queries = [];
		let saveQuery = this.saveQuery(o, options);
		let modelId = saveQuery.id;

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
				for (let n in options.oldItem) {
					if (!options.oldItem.hasOwnProperty(n)) continue;
					if (n in o) continue;
					o[n] = options.oldItem[n];
				}
			}

			output = this.filter(o);
		} catch (error) {
			Log.error('Cannot save model', error);
		}

		this.releaseSaveMutex(o, mutexRelease);

		return output;
	}

	static isNew(object, options) {
		if (options && ('isNew' in options)) {
			// options.isNew can be "auto" too
			if (options.isNew === true) return true;
			if (options.isNew === false) return false;
		}

		return !object.id;
	}

	static filterArray(models) {
		let output = [];
		for (let i = 0; i < models.length; i++) {
			output.push(this.filter(models[i]));
		}
		return output;
	}

	static filter(model) {
		if (!model) return model;

		let output = Object.assign({}, model);
		for (let n in output) {
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

	static delete(id, options = null) {
		if (!id) throw new Error('Cannot delete object without an ID');
		options = this.modOptions(options);
		return this.db().exec('DELETE FROM ' + this.tableName() + ' WHERE id = ?', [id]);
	}

	static batchDelete(ids, options = null) {
		if (!ids.length) return;
		options = this.modOptions(options);
		return this.db().exec('DELETE FROM ' + this.tableName() + ' WHERE id IN ("' + ids.join('","') + '")');
	}	

	static db() {
		if (!this.db_) throw new Error('Accessing database before it has been initialised');
		return this.db_;		
	}

	static isReady() {
		return !!this.db_;
	}

}

BaseModel.typeEnum_ = [
	['TYPE_NOTE', 1],
	['TYPE_FOLDER', 2],
	['TYPE_SETTING', 3],
	['TYPE_RESOURCE', 4],
	['TYPE_TAG', 5],
	['TYPE_NOTE_TAG', 6],
	['TYPE_SEARCH', 7],
	['TYPE_ALARM', 8],
	['TYPE_MASTER_KEY', 9],
];

for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
	const e = BaseModel.typeEnum_[i];
	BaseModel[e[0]] = e[1];
}

// BaseModel.TYPE_NOTE = 1;
// BaseModel.TYPE_FOLDER = 2;
// BaseModel.TYPE_SETTING = 3;
// BaseModel.TYPE_RESOURCE = 4;
// BaseModel.TYPE_TAG = 5;
// BaseModel.TYPE_NOTE_TAG = 6;
// BaseModel.TYPE_SEARCH = 7;
// BaseModel.TYPE_ALARM = 8;
// BaseModel.TYPE_MASTER_KEY = 9;

BaseModel.db_ = null;
BaseModel.dispatch = function(o) {};
BaseModel.saveMutexes_ = {};

module.exports = BaseModel;