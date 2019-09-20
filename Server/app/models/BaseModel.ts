import db, { WithDates, WithUuid } from '../db';
import * as Knex from 'knex';
const { uuid } = require('lib/uuid.js');
import { transactionHandler } from '../utils/dbUtils';

export interface DbOptions {
	db?: Knex<any, any[]>
	transaction?: Knex.Transaction,
}

export interface SaveOptions {
	isNew?: boolean,
}

export default abstract class BaseModel {

	private dbOptions_:DbOptions = null;

	constructor(dbOptions:DbOptions = null) {
		this.dbOptions_ = dbOptions;
	}

	get dbOptions():DbOptions {
		return this.dbOptions_;
	}

	get db():Knex<any, any[]> {
		if (transactionHandler.activeTransaction) return transactionHandler.activeTransaction;
		return db;
	}

	tableName():string {
		throw new Error('Not implemented');
	}

	hasDateProperties():boolean {
		return true;
	}

	async startTransaction():Promise<number> {
		return transactionHandler.start();
	}

	async commitTransaction(txIndex:number):Promise<void> {
		return transactionHandler.commit(txIndex);
	}

	async rollbackTransaction(txIndex:number):Promise<void> {
		return transactionHandler.rollback(txIndex);
	}

	async all<T>():Promise<T[]> {
		return this.db(this.tableName()).select('*');
	}

	toApiOutput(object:any):any {
		return { ...object };
	}

	async save<T>(object:T, options:SaveOptions = {}):Promise<T> {
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

		await this.db(this.tableName()).insert(newObject);

		return newObject;
	}

	async load<T>(id:string):Promise<T> {
		if (!id) throw new Error('ID cannot be empty');
		return this.db(this.tableName()).where({ id: id }).first();
	}

}
