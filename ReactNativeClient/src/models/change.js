import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Change extends BaseModel {

	static TYPE_UNKNOWN = 0;
	static TYPE_CREATE = 1;
	static TYPE_UPDATE = 2;
	static TYPE_DELETE = 3;

	static tableName() {
		return 'changes';
	}

	static newChange() {
		return {
			id: null,
			type: null,
			item_id: null,
			item_type: null,
			item_field: null,
		};
	}

	// static all() {
	// 	return this.db().selectAll('SELECT * FROM folders').then((r) => {
	// 		let output = [];
	// 		for (let i = 0; i < r.rows.length; i++) {
	// 			output.push(r.rows.item(i));
	// 		}
	// 		return output;
	// 	});
	// }

}

export { Change };