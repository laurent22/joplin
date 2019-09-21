import db, { WithDates, WithUuid, File, User, Session, Permission } from '../db';
import * as Knex from 'knex';
const { uuid } = require('lib/uuid.js');
import { transactionHandler } from '../utils/dbUtils';

export interface ModelOptions {
	userId?: string
}

export interface SaveOptions {
	isNew?: boolean,
}

export interface ValidateOptions {
	userId?: string
	isCreation?: boolean
}

export default abstract class BaseModel {

	private options_:ModelOptions = null;

	constructor(options:ModelOptions = null) {
		this.options_ = Object.assign({}, options);
	}

	get options():ModelOptions {
		return this.options_;
	}

	get userId():string {
		return this.options.userId;
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

	async save(object:File | User | Session | Permission, options:SaveOptions = {}):Promise<File | User | Session | Permission> {
		if (!object) throw new Error('Object cannot be empty');

		const toSave = Object.assign({}, object);

		const isNew = options.isNew === true || !(object as WithUuid).id;

		if (isNew && !(toSave as WithUuid).id) {
			(toSave as WithUuid).id = uuid.create();
		}

		if (this.hasDateProperties()) {
			const timestamp = Date.now();
			if (isNew) {
				(toSave as WithDates).created_time = timestamp;
			}
			(toSave as WithDates).updated_time = timestamp;
		}

		if (isNew) {
			await this.db(this.tableName()).insert(toSave);
		} else {
			const objectId:string = (toSave as WithUuid).id;
			if (!objectId) throw new Error('Missing "id" property');
			delete (toSave as WithUuid).id;
			await this.db(this.tableName()).update(toSave).where({id: objectId });
		}

		return toSave;
	}

	async load<T>(id:string):Promise<T> {
		if (!id) throw new Error('ID cannot be empty');
		return this.db(this.tableName()).where({ id: id }).first();
	}

}
