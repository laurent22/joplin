import db, { WithDates, WithUuid } from '../db';
import * as Knex from 'knex';
const { uuid } = require('lib/uuid.js');

export interface DbOptions {
	db?: Knex<any, any[]>
	transaction?: Knex.Transaction,
}

export interface SaveOptions {
	isNew?: boolean,
}

// The TransactionHandler allows handling the logic of transactions within
// the models. In particular it allows having transactions within transactions.
// Instead of rollback/commit, onError/onSuccess should be called so that
// it does what's appropriate depending on the context.
class TransactionHandler {

	private dbOptions_: DbOptions = null
	private hasCreatedTransaction_: boolean = false

	constructor(baseDbOptions:DbOptions) {
		this.dbOptions_ = { ...baseDbOptions };
	}

	get dbOptions():DbOptions {
		return this.dbOptions_;
	}

	private get db():Knex<any, any[]> {
		return this.dbOptions.db ? this.dbOptions.db : db;
	}

	async init() {
		if (!this.dbOptions_.transaction) {
			const trx = await this.db.transaction();
			this.dbOptions_.transaction = trx;
			this.hasCreatedTransaction_ = true;
		}
	}

	onError(error:Error) {
		if (this.hasCreatedTransaction_) {
			this.dbOptions_.transaction.rollback();
		}

		throw error;
	}

	onSuccess() {
		if (this.hasCreatedTransaction_) {
			this.dbOptions_.transaction.commit();
		}
	}

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
		if (!!this.dbOptions && !!this.dbOptions.transaction) return this.dbOptions.transaction;
		if (!!this.dbOptions && !!this.dbOptions.db) return this.dbOptions.db;
		return db;
	}

	tableName():string {
		throw new Error('Not implemented');
	}

	hasDateProperties():boolean {
		return true;
	}

	async transactionHandler(baseDbOptions:DbOptions):Promise<TransactionHandler> {
		const t = new TransactionHandler(baseDbOptions);
		await t.init();
		return t;
	}

	async all<T>():Promise<T[]> {
		return this.db(this.tableName()).select('*');
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
