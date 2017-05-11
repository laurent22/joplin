import { Log } from 'src/log.js';
import { Database } from 'src/database.js';
import createUuid from 'uuid/v4';

class BaseModel {

	static tableName() {
		throw new Error('Must be overriden');
	}

	static save(o) {
		let isNew = !o.id;
		if (isNew) o.id = createUuid();
		if (isNew) {
			let q = Database.insertQuery(this.tableName(), o);
			return this.db().insert(q.sql, q.params).then(() => {
				return o;
			});
		} else {
			Log.error('NOT EIMPLEMETNED');
			// TODO: update
		}
	}

	static setDb(database) {
		this.db_ = database;		
	}

	static db() {
		return this.db_;
	}

}

export { BaseModel };