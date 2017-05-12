import { Log } from 'src/log.js';
import { Database } from 'src/database.js';
import createUuid from 'uuid/v4';

class BaseModel {

	static tableName() {
		throw new Error('Must be overriden');
	}

	static useUuid() {
		return false;
	}

	static save(o) {
		let isNew = !o.id;
		let query = '';

		if (isNew) {
			if (this.useUuid()) o.id = createUuid();
			query = Database.insertQuery(this.tableName(), o);
		} else {
			let where = { id: o.id };
			let temp = Object.assign({}, o);
			delete temp.id;
			query = Database.updateQuery(this.tableName(), temp, where);
		}

		return this.db().exec(query.sql, query.params).then(() => { return o; });
	}

	static setDb(database) {
		this.db_ = database;		
	}

	static db() {
		return this.db_;
	}

}

export { BaseModel };