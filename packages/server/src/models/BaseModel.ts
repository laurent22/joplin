import { WithDates, WithUuid, databaseSchema, ItemType, Uuid, User } from '../services/database/types';
import { DbConnection, QueryContext } from '../db';
import TransactionHandler from '../utils/TransactionHandler';
import uuidgen from '../utils/uuidgen';
import { ErrorUnprocessableEntity, ErrorBadRequest } from '../utils/errors';
import { Models, NewModelFactoryHandler } from './factory';
import * as EventEmitter from 'events';
import { Config, Env } from '../utils/types';
import personalizedUserContentBaseUrl from '@joplin/lib/services/joplinServer/personalizedUserContentBaseUrl';
import Logger from '@joplin/lib/Logger';
import dbuuid from '../utils/dbuuid';
import { defaultPagination, PaginatedResults, Pagination } from './utils/pagination';
import { Knex } from 'knex';
import { unique } from '../utils/array';

const logger = Logger.create('BaseModel');

type SavePoint = string;

export enum UuidType {
	NanoId = 1,
	Native = 2,
}

export interface SaveOptions {
	isNew?: boolean;
	skipValidation?: boolean;
	validationRules?: any;
	previousItem?: any;
	queryContext?: QueryContext;
}

export interface LoadOptions {
	fields?: string[];
}

export interface AllPaginatedOptions extends LoadOptions {
	queryCallback?: (query: Knex.QueryBuilder)=> Knex.QueryBuilder;
}

export interface DeleteOptions {
	validationRules?: any;
	allowNoOp?: boolean;
	deletedItemUserIds?: Record<Uuid, Uuid[]>;
}

export interface ValidateOptions {
	isNew?: boolean;
	rules?: any;
}

export enum AclAction {
	Create = 1,
	Read = 2,
	Update = 3,
	Delete = 4,
	List = 5,
}

export default abstract class BaseModel<T> {

	private defaultFields_: string[] = [];
	private db_: DbConnection;
	private transactionHandler_: TransactionHandler;
	private modelFactory_: NewModelFactoryHandler;
	private static eventEmitter_: EventEmitter = null;
	private config_: Config;
	private savePoints_: SavePoint[] = [];

	public constructor(db: DbConnection, modelFactory: NewModelFactoryHandler, config: Config) {
		this.db_ = db;
		this.modelFactory_ = modelFactory;
		this.config_ = config;

		this.transactionHandler_ = new TransactionHandler(db);
	}

	// When a model create an instance of another model, the active
	// connection is passed to it. That connection can be the regular db
	// connection, or the active transaction.
	protected models(db: DbConnection = null): Models {
		return this.modelFactory_(db || this.db);
	}

	protected get baseUrl(): string {
		return this.config_.baseUrl;
	}

	protected get userContentBaseUrl(): string {
		return this.config_.userContentBaseUrl;
	}

	protected get env(): Env {
		return this.config_.env;
	}

	protected personalizedUserContentBaseUrl(userId: Uuid): string {
		return personalizedUserContentBaseUrl(userId, this.baseUrl, this.userContentBaseUrl);
	}

	protected get appName(): string {
		return this.config_.appName;
	}

	protected get itemSizeHardLimit(): number {
		return this.config_.itemSizeHardLimit;
	}

	public get db(): DbConnection {
		if (this.transactionHandler_.activeTransaction) return this.transactionHandler_.activeTransaction;
		return this.db_;
	}

	protected get defaultFields(): string[] {
		if (!this.defaultFields_.length) {
			this.defaultFields_ = Object.keys(databaseSchema[this.tableName]);
		}
		return this.defaultFields_.slice();
	}

	public static get eventEmitter(): EventEmitter {
		if (!this.eventEmitter_) {
			this.eventEmitter_ = new EventEmitter();
		}
		return this.eventEmitter_;
	}

	public async checkIfAllowed(_user: User, _action: AclAction, _resource: T = null): Promise<void> {
		throw new Error('Must be overriden');
	}

	protected selectFields(options: LoadOptions, defaultFields: string[] = null, mainTable = '', requiredFields: string[] = []): string[] {
		let output: string[] = [];
		if (options && options.fields) {
			output = options.fields;
		} else if (defaultFields) {
			output = defaultFields;
		} else {
			output = this.defaultFields;
		}

		if (!output.includes('*')) {
			for (const f of requiredFields) {
				if (!output.includes(f)) output.push(f);
			}
		}

		if (mainTable) {
			output = output.map(f => {
				if (f.includes(`${mainTable}.`)) return f;
				return `${mainTable}.${f}`;
			});
		}

		return output;
	}

	protected get tableName(): string {
		throw new Error('Not implemented');
	}

	protected get itemType(): ItemType {
		throw new Error('Not implemented');
	}

	protected hasUuid(): boolean {
		return true;
	}

	protected uuidType(): UuidType {
		return UuidType.NanoId;
	}

	protected autoTimestampEnabled(): boolean {
		return true;
	}

	protected hasUpdatedTime(): boolean {
		return this.autoTimestampEnabled();
	}

	protected get hasParentId(): boolean {
		return false;
	}

	// When using withTransaction, make sure any database call uses an instance
	// of `this.db()` that was accessed within the `fn` callback, otherwise the
	// transaction will be stuck!
	//
	// This for example, would result in a stuck transaction:
	//
	// const query = this.db(this.tableName).where('id', '=', id);
	//
	// this.withTransaction(async () => {
	//     await query.delete();
	// });
	//
	// This is because withTransaction is going to swap the value of "this.db()"
	// for as long as the transaction is active. So if the query is started
	// outside the transaction, it will use the regular db connection and wait
	// for the newly created transaction to finish, which will never happen.
	//
	// This is a bit of a leaky abstraction, which ideally should be improved
	// but for now one just has to be aware of the caveat.
	//
	// The `name` argument is only for debugging, so that any stuck transaction
	// can be more easily identified.
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	protected async withTransaction<T>(fn: Function, name: string): Promise<T> {
		const debugSteps = false;
		const debugTimeout = true;
		const timeoutMs = 10000;

		let txIndex = 0;

		const debugTimerId = debugTimeout ? setTimeout(() => {
			logger.error(`Transaction #${txIndex} did not complete:`, name);
			logger.error('Transaction stack:');
			logger.error(this.transactionHandler_.stackInfo);
		}, timeoutMs) : null;

		txIndex = await this.transactionHandler_.start(name);

		// eslint-disable-next-line no-console
		if (debugSteps) console.info('START', name, txIndex);

		let output: T = null;

		try {
			output = await fn();
		} catch (error) {
			// eslint-disable-next-line no-console
			if (debugSteps) console.info('ROLLBACK', name, txIndex);

			await this.transactionHandler_.rollback(txIndex);

			throw error;
		} finally {
			if (debugTimerId) clearTimeout(debugTimerId);
		}

		// eslint-disable-next-line no-console
		if (debugSteps) console.info('COMMIT', name, txIndex);

		await this.transactionHandler_.commit(txIndex);
		return output;
	}

	public async all(options: LoadOptions = {}): Promise<T[]> {
		const rows: any[] = await this.db(this.tableName).select(this.selectFields(options));
		return rows as T[];
	}

	public async allPaginated(pagination: Pagination, options: AllPaginatedOptions = {}): Promise<PaginatedResults<T>> {
		pagination = {
			...defaultPagination(),
			...pagination,
		};

		const itemCount = await this.count();

		let query = this
			.db(this.tableName)
			.select(this.selectFields(options));

		if (options.queryCallback) query = options.queryCallback(query);

		void query
			.orderBy(pagination.order[0].by, pagination.order[0].dir)
			.offset((pagination.page - 1) * pagination.limit)
			.limit(pagination.limit);

		const items = (await query) as T[];

		return {
			items,
			page_count: Math.ceil(itemCount / pagination.limit),
			has_more: items.length >= pagination.limit,
		};
	}

	public async count(): Promise<number> {
		const r = await this
			.db(this.tableName)
			.count('*', { as: 'item_count' });
		return r[0].item_count;
	}

	public fromApiInput(object: T): T {
		const blackList = ['updated_time', 'created_time', 'owner_id'];
		const whiteList = Object.keys(databaseSchema[this.tableName]);
		const output: any = { ...object };

		for (const f in object) {
			if (blackList.includes(f)) delete output[f];
			if (!whiteList.includes(f)) delete output[f];
		}

		return output;
	}

	protected objectToApiOutput(object: T): T {
		return { ...object };
	}

	public toApiOutput(object: T | T[]): T | T[] {
		if (Array.isArray(object)) {
			return object.map(f => this.objectToApiOutput(f));
		} else {
			return this.objectToApiOutput(object);
		}
	}

	protected async validate(object: T, options: ValidateOptions = {}): Promise<T> {
		if (!options.isNew && !(object as WithUuid).id) throw new ErrorUnprocessableEntity('id is missing');
		return object;
	}

	protected async isNew(object: T, options: SaveOptions): Promise<boolean> {
		if (options.isNew === false) return false;
		if (options.isNew === true) return true;
		if ('id' in (object as any) && !(object as WithUuid).id) throw new Error('ID cannot be undefined or null');
		return !(object as WithUuid).id;
	}

	public async save(object: T, options: SaveOptions = {}): Promise<T> {
		if (!object) throw new Error('Object cannot be empty');
		const toSave = { ...object };

		const isNew = await this.isNew(object, options);

		if (this.hasUuid() && isNew && !(toSave as WithUuid).id) {
			(toSave as WithUuid).id = this.uuidType() === UuidType.NanoId ? uuidgen() : dbuuid();
		}

		if (this.autoTimestampEnabled()) {
			const timestamp = Date.now();
			if (isNew) {
				(toSave as WithDates).created_time = timestamp;
			}
			if (this.hasUpdatedTime()) (toSave as WithDates).updated_time = timestamp;
		}

		if (options.skipValidation !== true) object = await this.validate(object, { isNew: isNew, rules: options.validationRules ? options.validationRules : {} });

		await this.withTransaction(async () => {
			if (isNew) {
				await this.db(this.tableName).insert(toSave).queryContext(options.queryContext || {});
			} else {
				const objectId: string = (toSave as WithUuid).id;
				if (!objectId) throw new Error('Missing "id" property');
				delete (toSave as WithUuid).id;
				const updatedCount: number = await this.db(this.tableName).update(toSave).where({ id: objectId }).queryContext(options.queryContext || {});
				(toSave as WithUuid).id = objectId;

				// Sanity check:
				if (updatedCount !== 1) throw new ErrorBadRequest(`one row should have been updated, but ${updatedCount} row(s) were updated`);
			}
		}, 'BaseModel::save');

		return toSave;
	}

	public async loadByIds(ids: string[] | number[], options: LoadOptions = {}): Promise<T[]> {
		if (!ids.length) return [];
		ids = unique(ids);
		return this.db(this.tableName).select(options.fields || this.defaultFields).whereIn('id', ids);
	}

	public async setSavePoint(): Promise<SavePoint> {
		const name = `sp_${uuidgen()}`;
		await this.db.raw(`SAVEPOINT ${name}`);
		this.savePoints_.push(name);
		return name;
	}

	public async rollbackSavePoint(savePoint: SavePoint) {
		const last = this.savePoints_.pop();
		if (last !== savePoint) throw new Error('Rollback save point does not match');
		await this.db.raw(`ROLLBACK TO SAVEPOINT ${savePoint}`);
	}

	public async releaseSavePoint(savePoint: SavePoint) {
		const last = this.savePoints_.pop();
		if (last !== savePoint) throw new Error('Rollback save point does not match');
		await this.db.raw(`RELEASE SAVEPOINT ${savePoint}`);
	}

	public async exists(id: string): Promise<boolean> {
		const o = await this.load(id, { fields: ['id'] });
		return !!o;
	}

	public async load(id: Uuid | number, options: LoadOptions = {}): Promise<T> {
		if (!id) throw new Error('id cannot be empty');

		return this.db(this.tableName).select(options.fields || this.defaultFields).where({ id: id }).first();
	}

	public async delete(id: string | string[] | number | number[], options: DeleteOptions = {}): Promise<void> {
		if (!id) throw new Error('id cannot be empty');

		const ids = (typeof id === 'string' || typeof id === 'number') ? [id] : id;

		if (!ids.length) throw new Error('no id provided');

		await this.withTransaction(async () => {
			const query = this.db(this.tableName).where({ id: ids[0] });
			for (let i = 1; i < ids.length; i++) {
				await query.orWhere({ id: ids[i] });
			}

			const deletedCount = await query.del();
			if (!options.allowNoOp && deletedCount !== ids.length) throw new Error(`${ids.length} row(s) should have been deleted but ${deletedCount} row(s) were deleted. ID: ${id}`);
		}, 'BaseModel::delete');
	}

}
