import { WithDates, WithUuid, File, User, Session, Permission, databaseSchema, ApiClient, DbConnection } from '../db';
import TransactionHandler from '../utils/TransactionHandler';
import uuidgen from '../utils/uuidgen';
import { ErrorUnprocessableEntity, ErrorBadRequest } from '../utils/errors';
import modelFactory, { Models } from './factory';

export interface ModelOptions {
	userId?: string;
}

export interface SaveOptions {
	isNew?: boolean;
	skipValidation?: boolean;
	validationRules?: any;
}

export interface DeleteOptions {
	validationRules?: any;
}

export interface ValidateOptions {
	isNew?: boolean;
	rules?: any;
}

export default abstract class BaseModel {

	private options_: ModelOptions = null;
	private defaultFields_: string[] = [];
	private db_: DbConnection;
	private transactionHandler_: TransactionHandler;

	public constructor(db: DbConnection, options: ModelOptions = null) {
		this.db_ = db;
		this.options_ = Object.assign({}, options);

		this.transactionHandler_ = new TransactionHandler(db);

		if ('userId' in this.options && !this.options.userId) throw new Error('If userId is set, it cannot be null');
	}

	protected get models(): Models {
		return modelFactory(this.db);
	}

	protected get options(): ModelOptions {
		return this.options_;
	}

	protected get userId(): string {
		return this.options.userId;
	}

	protected get db(): DbConnection {
		if (this.transactionHandler_.activeTransaction) return this.transactionHandler_.activeTransaction;
		return this.db_;
	}

	protected get defaultFields(): string[] {
		if (!this.defaultFields_.length) {
			this.defaultFields_ = Object.keys(databaseSchema[this.tableName]);
		}
		return this.defaultFields_.slice();
	}

	protected get tableName(): string {
		throw new Error('Not implemented');
	}

	protected hasDateProperties(): boolean {
		return true;
	}

	protected async startTransaction(): Promise<number> {
		return this.transactionHandler_.start();
	}

	protected async commitTransaction(txIndex: number): Promise<void> {
		return this.transactionHandler_.commit(txIndex);
	}

	protected async rollbackTransaction(txIndex: number): Promise<void> {
		return this.transactionHandler_.rollback(txIndex);
	}

	public async all(): Promise<File[] | User[] | Session[] | Permission[]> {
		return this.db(this.tableName).select(...this.defaultFields);
	}

	public async fromApiInput(object: File | User | Session | Permission | ApiClient): Promise<File | User | Session | Permission | ApiClient> {
		return object;
	}

	public toApiOutput(object: any): any {
		return { ...object };
	}

	protected async validate(object: File | User | Session | Permission | ApiClient, options: ValidateOptions = {}): Promise<File | User | Session | Permission | ApiClient> {
		if (!options.isNew && !(object as WithUuid).id) throw new ErrorUnprocessableEntity('id is missing');
		return object;
	}

	protected async isNew(object: File | User | Session | Permission | ApiClient, options: SaveOptions): Promise<boolean> {
		if (options.isNew === false) return false;
		if (options.isNew === true) return true;
		return !(object as WithUuid).id;
	}

	public async save(object: File | User | Session | Permission | ApiClient, options: SaveOptions = {}): Promise<File | User | Session | Permission | ApiClient> {
		if (!object) throw new Error('Object cannot be empty');

		const toSave = Object.assign({}, object);

		const isNew = await this.isNew(object, options);

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

		if (options.skipValidation !== true) object = await this.validate(object, { isNew: isNew, rules: options.validationRules ? options.validationRules : {} });

		if (isNew) {
			await this.db(this.tableName).insert(toSave);
		} else {
			const objectId: string = (toSave as WithUuid).id;
			if (!objectId) throw new Error('Missing "id" property');
			delete (toSave as WithUuid).id;
			const updatedCount: number = await this.db(this.tableName).update(toSave).where({ id: objectId });
			toSave.id = objectId;

			// Sanity check:
			if (updatedCount !== 1) throw new ErrorBadRequest(`one row should have been updated, but ${updatedCount} row(s) were updated`);
		}

		return toSave;
	}

	public async load(id: string): Promise<File | User | Session | Permission | ApiClient> {
		if (!id) throw new Error('id cannot be empty');

		return this.db(this.tableName).select(this.defaultFields).where({ id: id }).first();
	}

	public async delete(id: string | string[]): Promise<void> {
		if (!id) throw new Error('id cannot be empty');

		const ids = typeof id === 'string' ? [id] : id;

		if (!ids.length) throw new Error('no id provided');

		const query = this.db(this.tableName).where({ id: ids[0] });
		for (let i = 1; i < ids.length; i++) {
			await query.orWhere({ id: ids[i] });
		}

		const deletedCount = await query.del();
		if (deletedCount !== ids.length) throw new Error(`${ids.length} row(s) should have been deleted by ${deletedCount} row(s) were deleted`);
	}

}
