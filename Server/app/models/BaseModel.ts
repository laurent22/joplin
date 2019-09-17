import db, { WithDates, WithUuid } from '../db';
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

	static async save<T>(object:T, options:SaveOptions = {}):Promise<T> {
		if (!object) throw new Error('Object cannot be empty');

		const newObject:T = Object.assign({}, object);

		const isNew = options.isNew === true || !(object as WithUuid).id;

		if (isNew && !(newObject as WithUuid).id) {
			(newObject as WithUuid).id = uuid.create();
		}

		if (this.hasDateProperties()) {
			const timestamp = Date.now();
			if (isNew) {
				(newObject as WithDates).created_time = timestamp;
			}
			(newObject as WithDates).updated_time = timestamp;
		}

		await db(this.tableName()).insert(newObject);

		return newObject;
	}

	static async load<T>(id:string):Promise<T> {
		if (!id) throw new Error('ID cannot be empty');
		return db(this.tableName()).where({ id: id }).first();
	}

}
