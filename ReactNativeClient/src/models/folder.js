import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Folder extends BaseModel {

	static tableName() {
		return 'folders';
	}

	static useUuid() {
		return true;
	}

	static newFolder() {
		return {
			id: null,
			title: '',
		}
	}

	static all() {
		return this.db().selectAll('SELECT * FROM folders').then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

}

export { Folder };