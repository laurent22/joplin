import { Log } from 'src/log.js';
import { Database } from 'src/database.js';
import { Registry } from 'src/registry.js';
import { uuid } from 'src/uuid.js';

class BaseModel {

	static tableName() {
		throw new Error('Must be overriden');
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

	static save(o) {
		let isNew = !o.id;
		let query = '';

		if (isNew) {
			if (this.useUuid()) o.id = uuid.create();
			query = Database.insertQuery(this.tableName(), o);
		} else {
			let where = { id: o.id };
			let temp = Object.assign({}, o);
			delete temp.id;
			query = Database.updateQuery(this.tableName(), temp, where);
		}

		return this.db().exec(query.sql, query.params).then(() => { return o; });
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