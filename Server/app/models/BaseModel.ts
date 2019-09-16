import db, { WithDates } from '../db';

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
		object = Object.assign({}, object);

		if (this.hasDateProperties()) {
			const timestamp = Date.now();
			if (options.isNew) {
				(object as WithDates).created_time = timestamp;
			}
			(object as WithDates).updated_time = timestamp;
		}

		await db(this.tableName()).insert(object);
		return object;
	}

	static async load<T>(id:string):Promise<T> {
		return db(this.tableName()).where({ id: id }).first();
	}

}
