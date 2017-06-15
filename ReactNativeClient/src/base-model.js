import { Log } from 'src/log.js';
import { Database } from 'src/database.js';
import { uuid } from 'src/uuid.js';

class BaseModel {

	static tableName() {
		throw new Error('Must be overriden');
	}

	static useUuid() {
		return false;
	}

	static itemType() {
		throw new Error('Must be overriden');
	}

	static trackChanges() {
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

	static identifyItemType(item) {
		if (!item) throw new Error('Cannot identify undefined item');
		if ('body' in item || ('parent_id' in item && !!item.parent_id)) return BaseModel.ITEM_TYPE_NOTE;
		if ('sync_time' in item) return BaseModel.ITEM_TYPE_FOLDER;
		throw new Error('Cannot identify item: ' + JSON.stringify(item));
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

	static fromApiResult(apiResult) {
		let fieldNames = this.fieldNames();
		let output = {};
		for (let i = 0; i < fieldNames.length; i++) {
			let f = fieldNames[i];
			output[f] = f in apiResult ? apiResult[f] : null;
		}
		return output;
	}

	static modOptions(options) {
		if (!options) {
			options = {};
		} else {
			options = Object.assign({}, options);
		}
		if (!('trackChanges' in options)) options.trackChanges = true;
		if (!('isNew' in options)) options.isNew = 'auto';
		return options;
	}

	static load(id) {
		return this.loadByField('id', id);
	}

	static loadByField(fieldName, fieldValue) {	
		return this.db().selectOne('SELECT * FROM ' + this.tableName() + ' WHERE `' + fieldName + '` = ?', [fieldValue]);
	}

	static applyPatch(model, patch) {
		model = Object.assign({}, model);
		for (let n in patch) {
			if (!patch.hasOwnProperty(n)) continue;
			model[n] = patch[n];
		}
		return model;
	}

	static diffObjects(oldModel, newModel) {
		let output = {};
		for (let n in newModel) {
			if (!newModel.hasOwnProperty(n)) continue;
			if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
				output[n] = newModel[n];
			}
		}
		return output;
	}

	static saveQuery(o, isNew = 'auto') {
		if (isNew == 'auto') isNew = !o.id;

		let temp = {}
		let fieldNames = this.fieldNames();
		for (let i = 0; i < fieldNames.length; i++) {
			let n = fieldNames[i];
			if (n in o) temp[n] = o[n];
		}
		o = temp;

		let query = '';
		let itemId = o.id;

		if (!o.updated_time && this.hasField('updated_time')) {
			o.updated_time = Math.round((new Date()).getTime() / 1000);
		}

		if (isNew) {
			if (this.useUuid() && !o.id) {
				o = Object.assign({}, o);
				itemId = uuid.create();
				o.id = itemId;
			}

			if (!o.created_time && this.hasField('created_time')) {
				o.created_time = Math.round((new Date()).getTime() / 1000);
			}

			query = Database.insertQuery(this.tableName(), o);
		} else {
			let where = { id: o.id };
			let temp = Object.assign({}, o);
			delete temp.id;
			query = Database.updateQuery(this.tableName(), temp, where);
		}

		query.id = itemId;

		// Log.info('Saving', JSON.stringify(o));

		return query;
	}

	static save(o, options = null) {
		options = this.modOptions(options);

		let isNew = options.isNew == 'auto' ? !o.id : options.isNew;

		let queries = [];
		let saveQuery = this.saveQuery(o, isNew);
		let itemId = saveQuery.id;

		queries.push(saveQuery);

		// TODO: DISABLED DISABLED DISABLED DISABLED DISABLED DISABLED DISABLED DISABLED DISABLED DISABLED 
		if (0&& options.trackChanges && this.trackChanges()) {
			// Cannot import this class the normal way due to cyclical dependencies between Change and BaseModel
			// which are not handled by React Native.
			const { Change } = require('src/models/change.js');

			if (isNew) {
				let change = Change.newChange();
				change.type = Change.TYPE_CREATE;
				change.item_id = itemId;
				change.item_type = this.itemType();

				queries.push(Change.saveQuery(change));
			} else {
				for (let n in o) {
					if (!o.hasOwnProperty(n)) continue;
					if (n == 'id') continue;

					let change = Change.newChange();
					change.type = Change.TYPE_UPDATE;
					change.item_id = itemId;
					change.item_type = this.itemType();
					change.item_field = n;

					queries.push(Change.saveQuery(change));
				}
			}
		}

		return this.db().transactionExecBatch(queries).then(() => {
			o = Object.assign({}, o);
			o.id = itemId;
			return o;
		}).catch((error) => {
			Log.error('Cannot save model', error);
		});
	}

	static delete(id, options = null) {
		options = this.modOptions(options);

		if (!id) {
			Log.warn('Cannot delete object without an ID');
			return;
		}

		return this.db().exec('DELETE FROM ' + this.tableName() + ' WHERE id = ?', [id]).then(() => {
			if (options.trackChanges && this.trackChanges()) {
				const { Change } = require('src/models/change.js');

				let change = Change.newChange();
				change.type = Change.TYPE_DELETE;
				change.item_id = id;
				change.item_type = this.itemType();

				return Change.save(change);
			}
		});
	}

	static db() {
		if (!this.db_) throw new Error('Accessing database before it has been initialised');
		return this.db_;		
	}

}

BaseModel.ITEM_TYPE_NOTE = 1;
BaseModel.ITEM_TYPE_FOLDER = 2;
BaseModel.tableInfo_ = null;
BaseModel.tableKeys_ = null;
BaseModel.db_ = null;
BaseModel.dispatch = function(o) {};

export { BaseModel };