import db, { WithDates, WithUuid, File, User, Session, Permission } from '../db';
import * as Knex from 'knex';
import { transactionHandler } from '../utils/dbUtils';
import uuidgen from '../utils/uuidgen';
import { ErrorUnprocessableEntity, ErrorBadRequest } from '../utils/errors';

export interface ModelOptions {
	userId?: string
}

export interface SaveOptions {
	isNew?: boolean,
	skipValidation?: boolean,
}

export interface ValidateOptions {
	isNew?: boolean
}

export default abstract class BaseModel {

	private options_:ModelOptions = null;

	constructor(options:ModelOptions = null) {
		this.options_ = Object.assign({}, options);

		if ('userId' in this.options && !this.options.userId) throw new Error('If userId is set, it cannot be null');
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

	defaultFields():string | string[] {
		return '*';
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

	async fromApiInput(object:File | User | Session | Permission):Promise<File | User | Session | Permission> {
		return object;
	}

	toApiOutput(object:any):any {
		return { ...object };
	}

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	async validate(object:File | User | Session | Permission, options:ValidateOptions = {}):Promise<File | User | Session | Permission> {
		if (!options.isNew && !(object as WithUuid).id) throw new ErrorUnprocessableEntity('id is missing');
		return object;
	}

	isNew(object:File | User | Session | Permission, options:SaveOptions):boolean {
		if (options.isNew === false) return false;
		if (options.isNew === true) return true;
		return !(object as WithUuid).id;
	}

	async save(object:File | User | Session | Permission, options:SaveOptions = {}):Promise<File | User | Session | Permission> {
		if (!object) throw new Error('Object cannot be empty');

		const toSave = Object.assign({}, object);

		const isNew = this.isNew(object, options);

		if (isNew && !(toSave as WithUuid).id) {
			(toSave as WithUuid).id = uuidgen();
		}

		if (this.hasDateProperties()) {
			const timestamp = Date.now();
			if (isNew) {
				(toSave as WithDates).created_time = timestamp;
			}
			(toSave as WithDates).updated_time = timestamp;
		}

		if (options.skipValidation !== true) object = await this.validate(object, { isNew: isNew });

		if (isNew) {
			await this.db(this.tableName()).insert(toSave);
		} else {
			const objectId:string = (toSave as WithUuid).id;
			if (!objectId) throw new Error('Missing "id" property');
			delete (toSave as WithUuid).id;
			const updatedCount:number = await this.db(this.tableName()).update(toSave).where({id: objectId });
			toSave.id = objectId;

			// Sanity check:
			if (updatedCount !== 1) throw new ErrorBadRequest(`one row should have been updated, but ${updatedCount} row(s) were updated`);
		}

		return toSave;
	}

	async load(id:string):Promise<File | User | Session | Permission> {
		if (!id) throw new Error('ID cannot be empty');
		return this.db(this.tableName()).where({ id: id }).first();
	}

}
