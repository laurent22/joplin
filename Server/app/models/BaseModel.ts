import db from '../db';
const { uuid } = require('lib/uuid.js');

export interface SaveOptions {
	isNew?: boolean,
}

export default abstract class BaseModel {

	static tableName():string {
		throw new Error('Not implemented');
	}

	static hasDateProperties():boolean {
		return true;
	}

	static async save(object:any, options:SaveOptions = {}):Promise<any> {
		if (!object) throw new Error('Object cannot be empty');

		object = Object.assign({}, object);

		const isNew = options.isNew === true || !object.id;

		if (isNew && !object.id) {
			object.id = uuid.create();
		}

		if (this.hasDateProperties()) {
			const timestamp = Date.now();
			if (isNew) {
				object.created_time = timestamp;
			}
			object.updated_time = timestamp;
		}

		await db(this.tableName()).insert(object);

		return object;
	}

	static async load<T>(id:string):Promise<T> {
		if (!id) throw new Error('ID cannot be empty');
		return db(this.tableName()).where({ id: id }).first();
	}

}
