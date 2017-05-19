import { Log } from 'src/log.js';
import { Database } from 'src/database.js';
import { Registry } from 'src/registry.js';
import { uuid } from 'src/uuid.js';

class BaseModel {

	static ITEM_TYPE_NOTE = 1;
	static ITEM_TYPE_FOLDER = 2;
	static tableInfo_ = null;
	static tableKeys_ = null;

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

	static fieldNames() {
		return this.db().tableFieldNames(this.tableName());
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
		return this.db().selectOne('SELECT * FROM ' + this.tableName() + ' WHERE id = ?', [id]);
	}

	static saveQuery(o, isNew = 'auto') {
		if (isNew == 'auto') isNew = !o.id;
		let query = '';
		let itemId = o.id;

		if (isNew) {
			if (this.useUuid() && !o.id) {
				o = Object.assign({}, o);
				itemId = uuid.create();
				o.id = itemId;
			}
			query = Database.insertQuery(this.tableName(), o);
		} else {
			let where = { id: o.id };
			let temp = Object.assign({}, o);
			delete temp.id;
			query = Database.updateQuery(this.tableName(), temp, where);
		}

		query.id = itemId;

		return query;
	}

	static save(o, options = null) {
		options = this.modOptions(options);

		let isNew = options.isNew == 'auto' ? !o.id : options.isNew;
		let query = this.saveQuery(o, isNew);

		return this.db().transaction((tx) => {
			tx.executeSql(query.sql, query.params);

			if (options.trackChanges && this.trackChanges()) {
				// Cannot import this class the normal way due to cyclical dependencies between Change and BaseModel
				// which are not handled by React Native.
				const { Change } = require('src/models/change.js');

				if (isNew) {
					let change = Change.newChange();
					change.type = Change.TYPE_CREATE;
					change.item_id = query.id;
					change.item_type = this.itemType();

					let changeQuery = Change.saveQuery(change);
					tx.executeSql(changeQuery.sql, changeQuery.params);
				} else {
					for (let n in o) {
						if (!o.hasOwnProperty(n)) continue;

						let change = Change.newChange();
						change.type = Change.TYPE_UPDATE;
						change.item_id = query.id;
						change.item_type = this.itemType();
						change.item_field = n;

						let changeQuery = Change.saveQuery(change);
						tx.executeSql(changeQuery.sql, changeQuery.params);
					}
				}
			}
		}).then(() => {
			o = Object.assign({}, o);
			o.id = query.id;
			return o;
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
		return Registry.db();
	}

}

export { BaseModel };