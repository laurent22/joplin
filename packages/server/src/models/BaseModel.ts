import { WithDates, WithUuid, File, User, Session, Permission, databaseSchema, ApiClient, DbConnection, Change, ItemType, ChangeType } from '../db';
import TransactionHandler from '../utils/TransactionHandler';
import uuidgen from '../utils/uuidgen';
import { ErrorUnprocessableEntity, ErrorBadRequest } from '../utils/errors';
import { Models } from './factory';

export type AnyItemType = File | User | Session | Permission | ApiClient | Change;
export type AnyItemTypes = File[] | User[] | Session[] | Permission[] | ApiClient[] | Change[];

export interface ModelOptions {
	userId?: string;
}

export interface SaveOptions {
	isNew?: boolean;
	skipValidation?: boolean;
	validationRules?: any;
	trackChanges?: boolean;
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
	private modelFactory_: Function;

	public constructor(db: DbConnection, modelFactory: Function, options: ModelOptions = null) {
		this.db_ = db;
		this.modelFactory_ = modelFactory;
		this.options_ = Object.assign({}, options);

		this.transactionHandler_ = new TransactionHandler(db);

		if ('userId' in this.options && !this.options.userId) throw new Error('If userId is set, it cannot be null');
	}

	// When a model create an instance of another model, the active
	// connection is passed to it. That connection can be the regular db
	// connection, or the active transaction.
	protected models(db: DbConnection = null): Models {
		return this.modelFactory_(db || this.db);
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

	protected get itemType(): ItemType {
		throw new Error('Not implemented');
	}

	protected get trackChanges(): boolean {
		return false;
	}

	protected hasUuid(): boolean {
		return true;
	}

	protected hasDateProperties(): boolean {
		return true;
	}

	protected get hasParentId(): boolean {
		return false;
	}

	protected async withTransaction(fn: Function): Promise<void> {
		const txIndex = await this.transactionHandler_.start();

		try {
			await fn();
		} catch (error) {
			await this.transactionHandler_.rollback(txIndex);
			throw error;
		}

		await this.transactionHandler_.commit(txIndex);
	}

	public async all(): Promise<AnyItemTypes> {
		return this.db(this.tableName).select(...this.defaultFields);
	}

	public fromApiInput(object: AnyItemType): AnyItemType {
		return object;
	}

	public toApiOutput(object: any): any {
		return { ...object };
	}

	protected async validate(object: AnyItemType, options: ValidateOptions = {}): Promise<AnyItemType> {
		if (!options.isNew && !(object as WithUuid).id) throw new ErrorUnprocessableEntity('id is missing');
		return object;
	}

	protected async isNew(object: AnyItemType, options: SaveOptions): Promise<boolean> {
		if (options.isNew === false) return false;
		if (options.isNew === true) return true;
		return !(object as WithUuid).id;
	}

	private async handleChangeTracking(options: SaveOptions, item: AnyItemType, changeType: ChangeType): Promise<void> {
		const trackChanges = this.trackChanges && options.trackChanges !== false;
		if (!trackChanges) return;

		let parentId = null;
		if (this.hasParentId) {
			if (!('parent_id' in item)) {
				const temp: any = await this.db(this.tableName).select(['parent_id']).where('id', '=', item.id).first();
				parentId = temp.parent_id;
			} else {
				parentId = item.parent_id;
			}
		}

		// Sanity check - shouldn't happen
		// Parent ID can be an empty string for root folders, but it shouldn't be null or undefined
		if (this.hasParentId && !parentId && parentId !== '') throw new Error(`Could not find parent ID for item: ${item.id}`);

		const changeModel = this.models().change({ userId: this.userId });
		await changeModel.add(this.itemType, parentId, (item as WithUuid).id, (item as any).name || '', changeType);
	}

	public async save(object: AnyItemType, options: SaveOptions = {}): Promise<AnyItemType> {
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

		await this.withTransaction(async () => {
			if (isNew) {
				await this.db(this.tableName).insert(toSave);
				await this.handleChangeTracking(options, toSave, ChangeType.Create);
			} else {
				const objectId: string = (toSave as WithUuid).id;
				if (!objectId) throw new Error('Missing "id" property');
				delete (toSave as WithUuid).id;
				const updatedCount: number = await this.db(this.tableName).update(toSave).where({ id: objectId });
				toSave.id = objectId;

				await this.handleChangeTracking(options, toSave, ChangeType.Update);

				// Sanity check:
				if (updatedCount !== 1) throw new ErrorBadRequest(`one row should have been updated, but ${updatedCount} row(s) were updated`);
			}
		});

		return toSave;
	}

	public async loadByIds(ids: string[]): Promise<AnyItemType[]> {
		if (!ids.length) return [];
		return this.db(this.tableName).select(this.defaultFields).whereIn('id', ids);
	}

	public async load(id: string): Promise<AnyItemType> {
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

		const trackChanges = this.trackChanges;

		let itemsWithParentIds: AnyItemType[] = null;
		if (trackChanges) {
			itemsWithParentIds = await this.db(this.tableName).select(['id', 'parent_id', 'name']).whereIn('id', ids);
		}

		await this.withTransaction(async () => {
			const deletedCount = await query.del();
			if (deletedCount !== ids.length) throw new Error(`${ids.length} row(s) should have been deleted by ${deletedCount} row(s) were deleted`);

			if (trackChanges) {
				for (const item of itemsWithParentIds) await this.handleChangeTracking({}, item, ChangeType.Delete);
			}
		});
	}

}
