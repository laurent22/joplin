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

	static saveQuery(o, isNew = 'auto') {
		if (isNew == 'auto') isNew = !o.id;		
		let query = '';
		let itemId = o.id;

		if (isNew) {
			if (this.useUuid()) {
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

	static save(o, trackChanges = true, isNew = 'auto') {
		if (isNew == 'auto') isNew = !o.id;
		let query = this.saveQuery(o, isNew);

		return this.db().transaction((tx) => {
			tx.executeSql(query.sql, query.params);

			if (trackChanges && this.trackChanges()) {
				// Cannot import this class the normal way due to cyclical dependencies between Change and BaseModel
				// which are not handled by React Native.
				const { Change } = require('src/models/change.js');

				let change = Change.newChange();
				change.type = isNew ? Change.TYPE_CREATE : Change.TYPE_UPDATE;
				change.item_id = query.id;
				change.item_type = this.itemType();

				let changeQuery = Change.saveQuery(change);
				tx.executeSql(changeQuery.sql, changeQuery.params);

				// TODO: item field for UPDATE
			}
		}).then(() => {
			o = Object.assign({}, o);
			o.id = query.id;

			this.dispatch({
				type: 'FOLDERS_UPDATE_ONE',
				folder: o,
			});

			return o;
		});
	}

	static delete(id) {
		if (!id) {
			Log.warn('Cannot delete object without an ID');
			return;
		}

		return this.db().exec('DELETE FROM ' + this.tableName() + ' WHERE id = ?', [id]);
	}

	static db() {
		return Registry.db();
	}

}

export { BaseModel };