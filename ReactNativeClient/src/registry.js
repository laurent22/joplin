// Stores global dynamic objects that are not state but that are required
// throughout the application. Dependency injection would be a better solution
// but more complex and YAGNI at this point. However classes that make use of the
// registry should be designed in such a way that they can be converted to use
// dependency injection later on (eg. `BaseModel.db()`, `Synchroniser.api()`)

import { Database } from 'src/database.js'

class Registry {

	static setDebugMode(v) {
		this.debugMode_ = v;
	}

	static debugMode() {
		if (this.debugMode_ === undefined) return false;
		return this.debugMode_;
	}

	static setApi(v) {
		this.api_ = v;
	}

	static setDb(v) {
		this.db_ = v;
	}

	static db() {
		if (!this.db_) throw new Error('Accessing database before it has been initialised');
		// if (!this.db_) {
		// 	this.db_ = new Database();
		// 	this.db_.setDebugEnabled(this.debugMode());
		// 	this.db_.open();
		// }
		return this.db_;
	}

	static api() {
		if (!this.api_) throw new Error('Accessing web API before it has been initialised');
		return this.api_;
	}

}

export { Registry };