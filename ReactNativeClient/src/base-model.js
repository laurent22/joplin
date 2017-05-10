import { Log } from 'src/log.js';
import { Database } from 'src/database.js';

class BaseModel {

	static tableName() {
		throw new Error('Must be overriden');
	}

	static save(object) {
		let sql = Database.insertSql(this.tableName(), object);
		Log.info(sql);
	}

	static setDb(database) {
		this.db_ = database;		
	}

	static db() {
		return this.db_;
	}

}

export { BaseModel };