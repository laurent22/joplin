import { Log } from 'lib/log.js';
import { Database } from 'lib/database.js';
import { uuid } from 'lib/uuid.js';
import { time } from 'lib/time-utils.js';

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

	static hasField(name) {
		let fields = this.fieldNames();
		return fields.indexOf(name) >= 0;
	}

	static fieldNames() {
		return this.db().tableFieldNames(this.tableName());
	}

	static fieldType(name) {
		let fields = this.fields();
		for (let i = 0; i < fields.length; i++) {
			if (fields[i].name == name) return fields[i].type;
		}
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

	static count() {
		return this.db().selectOne('SELECT count(*) as total FROM `' + this.tableName() + '`').then((r) => {
			return r ? r['total'] : 0;
		});
	}

	static load(id) {
		return this.loadByField('id', id);
	}

	static loadByPartialId(partialId) {
		return this.modelSelectOne('SELECT * FROM `' + this.tableName() + '` WHERE `id` LIKE ?', [partialId + '%']);
	}

	static applySqlOptions(options, sql, params = null) {
		if (!options) options = {};

		if (options.orderBy) {
			sql += ' ORDER BY ' + options.orderBy;
			if (options.caseInsensitive === true) sql += ' COLLATE NOCASE';
			if (options.orderByDir) sql += ' ' + options.orderByDir;
		}
		if (options.limit) sql += ' LIMIT ' + options.limit;

		return { sql: sql, params: params };
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

	static loadByField(fieldName, fieldValue) {
		return this.modelSelectOne('SELECT * FROM `' + this.tableName() + '` WHERE `' + fieldName + '` = ?', [fieldValue]);
	}

	static loadByTitle(fieldValue) {
		return this.modelSelectOne('SELECT * FROM `' + this.tableName() + '` WHERE `title` = ?', [fieldValue]);
	}

	static diffObjects(oldModel, newModel) {
		let output = {};
		let type = null;
		for (let n in newModel) {
			if (n == 'type_') {
				type = n;
				continue;
			}
			if (!newModel.hasOwnProperty(n)) continue;
			if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
				output[n] = newModel[n];
			}
		}
		if (type !== null) output.type_ = type;
		return output;
	}

	static saveQuery(o, options) {
		let temp = {}
		let fieldNames = this.fieldNames();
		for (let i = 0; i < fieldNames.length; i++) {
			let n = fieldNames[i];
			if (n in o) temp[n] = o[n];
		}
		o = temp;

		let query = {};
		let modelId = o.id;

		if (options.autoTimestamp && this.hasField('updated_time')) {
			o.updated_time = time.unixMs();
		}

		if (options.isNew) {
			if (this.useUuid() && !o.id) {
				modelId = uuid.create();
				o.id = modelId;
			}

			if (!o.created_time && this.hasField('created_time')) {
				o.created_time = time.unixMs();
			}

			query = Database.insertQuery(this.tableName(), o);
		} else {
			let where = { id: o.id };
			let temp = Object.assign({}, o);
			delete temp.id;
			query = Database.updateQuery(this.tableName(), temp, where);
		}

		query.id = modelId;

		return query;
	}

	static save(o, options = null) {
		options = this.modOptions(options);
		options.isNew = this.isNew(o, options);

		o = this.filter(o);

		let queries = [];
		let saveQuery = this.saveQuery(o, options);
		let modelId = saveQuery.id;

		queries.push(saveQuery);

		return this.db().transactionExecBatch(queries).then(() => {
			o = Object.assign({}, o);
			o.id = modelId;
			o = this.addModelMd(o);
			return this.filter(o);
		}).catch((error) => {
			Log.error('Cannot save model', error);
		});
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
			if (output[n] === true) output[n] = 1;
			if (output[n] === false) output[n] = 0;
		}
		
		return output;
	}

	static delete(id, options = null) {
		options = this.modOptions(options);
		if (!id) throw new Error('Cannot delete object without an ID');
		return this.db().exec('DELETE FROM ' + this.tableName() + ' WHERE id = ?', [id]);
	}

	static batchDelete(ids, options = null) {
		options = this.modOptions(options);
		if (!ids.length) throw new Error('Cannot delete object without an ID');
		return this.db().exec('DELETE FROM ' + this.tableName() + ' WHERE id IN ("' + ids.join('","') + '")');
	}	

	static db() {
		if (!this.db_) throw new Error('Accessing database before it has been initialised');
		return this.db_;		
	}

}

BaseModel.TYPE_NOTE = 1;
BaseModel.TYPE_FOLDER = 2;
BaseModel.TYPE_SETTING = 3;
BaseModel.TYPE_RESOURCE = 4;
BaseModel.TYPE_TAG = 5;
BaseModel.TYPE_NOTE_TAG = 6;

BaseModel.db_ = null;
BaseModel.dispatch = function(o) {};

export { BaseModel };