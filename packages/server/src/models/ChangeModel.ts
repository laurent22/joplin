import { Knex } from 'knex';
import Logger from '@joplin/utils/Logger';
import { DbConnection, SqliteMaxVariableNum, isPostgres } from '../db';
import { Change, ChangeType, Item, Uuid } from '../services/database/types';
import { md5 } from '../utils/crypto';
import { ErrorResyncRequired } from '../utils/errors';
import { Day, formatDateTime } from '../utils/time';
import BaseModel, { SaveOptions } from './BaseModel';
import { PaginatedResults } from './utils/pagination';
import { NewModelFactoryHandler } from './factory';
import { Config } from '../utils/types';

const logger = Logger.create('ChangeModel');

export const defaultChangeTtl = 180 * Day;

export interface DeltaChange extends Change {
	jop_updated_time?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	jopItem?: any;
}

export type PaginatedDeltaChanges = PaginatedResults<DeltaChange>;

export type PaginatedChanges = PaginatedResults<Change>;

export interface ChangePagination {
	limit?: number;
	cursor?: string;
}

export interface ChangePreviousItem {
	name: string;
	jop_parent_id: string;
	jop_resource_ids: string[];
	jop_share_id: string;
}

export function defaultDeltaPagination(): ChangePagination {
	return {
		limit: 200,
		cursor: '',
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function requestDeltaPagination(query: any): ChangePagination {
	if (!query) return defaultDeltaPagination();

	const output: ChangePagination = {};
	if ('limit' in query) output.limit = query.limit;
	if ('cursor' in query) output.cursor = query.cursor;
	return output;
}

export default class ChangeModel extends BaseModel<Change> {

	public deltaIncludesItems_: boolean;

	public constructor(db: DbConnection, dbSlave: DbConnection, modelFactory: NewModelFactoryHandler, config: Config) {
		super(db, dbSlave, modelFactory, config);
		this.deltaIncludesItems_ = config.DELTA_INCLUDES_ITEMS;
	}

	public get tableName(): string {
		return 'changes';
	}

	protected hasUuid(): boolean {
		return true;
	}

	public serializePreviousItem(item: ChangePreviousItem): string {
		return JSON.stringify(item);
	}

	public unserializePreviousItem(item: string): ChangePreviousItem {
		if (!item) return null;
		return JSON.parse(item);
	}

	public changeUrl(): string {
		return `${this.baseUrl}/changes`;
	}

	public async allFromId(id: string, limit: number = SqliteMaxVariableNum): Promise<PaginatedChanges> {
		const startChange: Change = id ? await this.load(id) : null;
		const query = this.db(this.tableName).select(...this.defaultFields);
		if (startChange) void query.where('counter', '>', startChange.counter);
		void query.limit(limit);
		let results: Change[] = await query;
		const hasMore = !!results.length;
		const cursor = results.length ? results[results.length - 1].id : id;
		results = await this.removeDeletedItems(results);
		results = await this.compressChanges(results);
		return {
			items: results,
			has_more: hasMore,
			cursor,
		};
	}

	public async changesForUserQuery(userId: Uuid, fromCounter: number, limit: number, doCountQuery: boolean): Promise<Change[]> {
		// When need to get:
		//
		// - All the CREATE and DELETE changes associated with the user
		// - All the UPDATE changes that applies to items associated with the
		//   user.
		//
		// UPDATE changes do not have the user_id set because they are specific
		// to the item, not to a particular user.

		// The extra complexity is due to the fact that items can be shared between users.
		//
		// - CREATE: When a user creates an item, a corresponding user_item is added to their
		//   collection. When that item is shared with another user, a user_item is also added to
		//   that user's collection, via ShareModel::updateSharedItems(). Each user has their own
		//   `change` object for the creation operations. For example if a user shares a note with
		//   two users, there will be a total of three `change` objects for that item, each
		//   associated with on of these users. See UserItemModel::addMulti()
		//
		// - DELETE: When an item is deleted, all corresponding user_items are deleted. Likewise,
		//   there's a `change` object per user. See UserItemModel::deleteBy()
		//
		// - UPDATE: Updates are different because only one `change` object will be created per
		//   change, even if the item is shared multiple times. This is why we need a different
		//   query for it. See ItemModel::save()

		// This used to be just one query but it kept getting slower and slower
		// as the `changes` table grew. So it is now split into two queries
		// merged by a UNION ALL.

		const fields = [
			'id',
			'item_id',
			'item_name',
			'type',
			'updated_time',
			'counter',
		];

		const fieldsSql = `"${fields.join('", "')}"`;

		const subQuery1 = `
			SELECT ${fieldsSql}
			FROM "changes"
			WHERE counter > ?
			AND (type = ? OR type = ?)
			AND user_id = ?
			ORDER BY "counter" ASC
			${doCountQuery ? '' : 'LIMIT ?'}
		`;

		const subParams1 = [
			fromCounter,
			ChangeType.Create,
			ChangeType.Delete,
			userId,
		];

		if (!doCountQuery) subParams1.push(limit);

		// The "+ 0" was added to prevent Postgres from scanning the `changes` table in `counter`
		// order, which is an extremely slow query plan. With "+ 0" it went from 2 minutes to 6
		// seconds for a particular query. https://dba.stackexchange.com/a/338597/37012

		const subQuery2 = `
			SELECT ${fieldsSql}
			FROM "changes"
			WHERE counter > ?
			AND type = ?
			AND item_id IN (SELECT item_id FROM user_items WHERE user_id = ?)
			ORDER BY "counter" + 0 ASC
			${doCountQuery ? '' : 'LIMIT ?'}
		`;

		const subParams2 = [
			fromCounter,
			ChangeType.Update,
			userId,
		];

		if (!doCountQuery) subParams2.push(limit);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let query: Knex.Raw<any> = null;

		const finalParams = subParams1.concat(subParams2);

		// For Postgres, we need to use materialized tables because, even
		// though each independent query is fast, the query planner end up going
		// for a very slow plan when they are combined with UNION ALL.
		// https://dba.stackexchange.com/a/333147/37012
		//
		// Normally we could use the same query for SQLite since it supports
		// materialized views too, but it doesn't work for some reason so we
		// keep the non-optimised query.

		if (!doCountQuery) {
			finalParams.push(limit);

			if (isPostgres(this.dbSlave(userId))) {
				query = this.dbSlave(userId).raw(`
					WITH cte1 AS MATERIALIZED (
						${subQuery1}
					)
					, cte2 AS MATERIALIZED (
						${subQuery2}
					)
					TABLE cte1
					UNION ALL
					TABLE cte2
					ORDER BY counter ASC
					LIMIT ?
				`, finalParams);
			} else {
				query = this.dbSlave(userId).raw(`
					SELECT ${fieldsSql} FROM (${subQuery1}) as sub1
					UNION ALL				
					SELECT ${fieldsSql} FROM (${subQuery2}) as sub2
					ORDER BY counter ASC
					LIMIT ?
				`, finalParams);
			}
		} else {
			query = this.dbSlave(userId).raw(`
				SELECT count(*) as total
				FROM (
					(${subQuery1})
					UNION ALL				
					(${subQuery2})
				) AS merged
			`, finalParams);
		}

		const results = await query;

		// Because it's a raw query, we need to handle the results manually:
		// Postgres returns an object with a "rows" property, while SQLite
		// returns the rows directly;
		const output: Change[] = results.rows ? results.rows : results;

		// This property is present only for the purpose of ordering the results
		// and can be removed afterwards.
		for (const change of output) delete change.counter;

		return output;
	}

	public async delta(userId: Uuid, pagination: ChangePagination = null): Promise<PaginatedDeltaChanges> {
		pagination = {
			...defaultDeltaPagination(),
			...pagination,
		};

		let changeAtCursor: Change = null;

		if (pagination.cursor) {
			changeAtCursor = await this.load(pagination.cursor) as Change;
			if (!changeAtCursor) throw new ErrorResyncRequired();
		}

		const changes = await this.changesForUserQuery(
			userId,
			changeAtCursor ? changeAtCursor.counter : -1,
			pagination.limit,
			false,
		);

		let items: Item[] = await this.db('items').select('id', 'jop_updated_time').whereIn('items.id', changes.map(c => c.item_id));

		let processedChanges = this.compressChanges(changes);
		processedChanges = await this.removeDeletedItems(processedChanges, items);

		if (this.deltaIncludesItems_) {
			items = await this.models().item().loadWithContentMulti(processedChanges.map(c => c.item_id), {
				fields: [
					'content',
					'id',
					'jop_encryption_applied',
					'jop_id',
					'jop_parent_id',
					'jop_share_id',
					'jop_type',
					'jop_updated_time',
				],
			});
		}

		const finalChanges = processedChanges.map(change => {
			const item = items.find(item => item.id === change.item_id);
			if (!item) return this.deltaIncludesItems_ ? { ...change, jopItem: null } : { ...change };
			const deltaChange: DeltaChange = {
				...change,
				jop_updated_time: item.jop_updated_time,
			};
			if (this.deltaIncludesItems_) {
				deltaChange.jopItem = item.jop_type ? this.models().item().itemToJoplinItem(item) : null;
			}
			return deltaChange;
		});

		return {
			items: finalChanges,
			// If we have changes, we return the ID of the latest changes from which delta sync can resume.
			// If there's no change, we return the previous cursor.
			cursor: changes.length ? changes[changes.length - 1].id : pagination.cursor,
			has_more: changes.length >= pagination.limit,
		};
	}

	private async removeDeletedItems(changes: Change[], items: Item[] = null): Promise<Change[]> {
		const itemIds = changes.map(c => c.item_id);

		// We skip permission check here because, when an item is shared, we need
		// to fetch files that don't belong to the current user. This check
		// would not be needed anyway because the change items are generated in
		// a context where permissions have already been checked.
		items = items === null ? await this.db('items').select('id').whereIn('items.id', itemIds) : items;

		const output: Change[] = [];

		for (const change of changes) {
			const item = items.find(f => f.id === change.item_id);

			// If the item associated with this change has been deleted, we have
			// two cases:
			// - If it's a "delete" change, add it to the list.
			// - If it's anything else, skip it. The "delete" change will be
			//   sent on one of the next pages.

			if (!item && change.type !== ChangeType.Delete) {
				continue;
			}

			output.push(change);
		}

		return output;
	}

	// Compresses the changes so that, for example, multiple updates on the same
	// item are reduced down to one, because calling code usually only needs to
	// know that the item has changed at least once. The reduction is basically:
	//
	//     create - update => create
	//     create - delete => NOOP
	//     update - update => update
	//     update - delete => delete
	//     delete - create => create
	//
	// There's one exception for changes that include a "previous_item". This is
	// used to save specific properties about the previous state of the item,
	// such as "jop_parent_id" or "name", which is used by the share mechanism
	// to know if an item has been moved from one folder to another. In that
	// case, we need to know about each individual change, so they are not
	// compressed.
	//
	// The latest change, when an item goes from DELETE to CREATE seems odd but
	// can happen because we are not checking for "item" changes but for
	// "user_item" changes. When sharing is involved, an item can be shared
	// (CREATED), then unshared (DELETED), then shared again (CREATED). When it
	// happens, we want the user to get the item, thus we generate a CREATE
	// event.
	private compressChanges(changes: Change[]): Change[] {
		const itemChanges: Record<Uuid, Change> = {};

		const uniqueUpdateChanges: Record<Uuid, Record<string, Change>> = {};

		for (const change of changes) {
			const itemId = change.item_id;
			const previous = itemChanges[itemId];

			if (change.type === ChangeType.Update) {
				const key = md5(itemId + change.previous_item);
				if (!uniqueUpdateChanges[itemId]) uniqueUpdateChanges[itemId] = {};
				uniqueUpdateChanges[itemId][key] = change;
			}

			if (previous) {
				if (previous.type === ChangeType.Create && change.type === ChangeType.Update) {
					continue;
				}

				if (previous.type === ChangeType.Create && change.type === ChangeType.Delete) {
					delete itemChanges[itemId];
				}

				if (previous.type === ChangeType.Update && change.type === ChangeType.Update) {
					itemChanges[itemId] = change;
				}

				if (previous.type === ChangeType.Update && change.type === ChangeType.Delete) {
					itemChanges[itemId] = change;
				}

				if (previous.type === ChangeType.Delete && change.type === ChangeType.Create) {
					itemChanges[itemId] = change;
				}
			} else {
				itemChanges[itemId] = change;
			}
		}

		const output: Change[] = [];

		for (const itemId in itemChanges) {
			const change = itemChanges[itemId];
			if (change.type === ChangeType.Update) {
				for (const key of Object.keys(uniqueUpdateChanges[itemId])) {
					output.push(uniqueUpdateChanges[itemId][key]);
				}
			} else {
				output.push(change);
			}
		}

		output.sort((a: Change, b: Change) => a.counter < b.counter ? -1 : +1);

		return output;
	}

	// See spec for complete documentation:
	// https://joplinapp.org/spec/server_delta_sync/#regarding-the-deletion-of-old-change-events
	public async compressOldChanges(ttl: number = null) {
		ttl = ttl === null ? defaultChangeTtl : ttl;
		const cutOffDate = Date.now() - ttl;
		const limit = 1000;
		const doneItemIds: Uuid[] = [];

		interface ChangeReportItem {
			total: number;
			max_created_time: number;
			item_id: Uuid;
		}

		let error: Error = null;
		let totalDeletedCount = 0;

		logger.info(`compressOldChanges: Processing changes older than: ${formatDateTime(cutOffDate)} (${cutOffDate})`);

		while (true) {
			// First get all the UPDATE changes before the specified date, and
			// order by the items that had the most changes. Also for each item
			// get the most recent change date from within that time interval,
			// as we need this below.

			const changeReport: ChangeReportItem[] = await this
				.db(this.tableName)

				.select(['item_id'])
				.countDistinct('id', { as: 'total' })
				.max('created_time', { as: 'max_created_time' })

				.where('type', '=', ChangeType.Update)
				.where('created_time', '<', cutOffDate)

				.groupBy('item_id')
				.havingRaw('count(id) > 1')
				.orderBy('total', 'desc')
				.limit(limit);

			if (!changeReport.length) break;

			await this.withTransaction(async () => {
				for (const row of changeReport) {
					if (doneItemIds.includes(row.item_id)) {
						// We don't throw from within the transaction because
						// that would rollback all other operations even though
						// they are valid. So we save the error and exit.
						error = new Error(`Trying to process an item that has already been done. Aborting. Row: ${JSON.stringify(row)}`);
						return;
					}

					// Still from within the specified interval, delete all
					// UPDATE changes, except for the most recent one.

					const deletedCount = await this
						.db(this.tableName)
						.where('type', '=', ChangeType.Update)
						.where('created_time', '<', cutOffDate)
						.where('created_time', '!=', row.max_created_time)
						.where('item_id', '=', row.item_id)
						.delete();

					totalDeletedCount += deletedCount;
					doneItemIds.push(row.item_id);
				}
			}, 'ChangeModel::compressOldChanges');

			logger.info(`compressOldChanges: Processed: ${doneItemIds.length} items. Deleted: ${totalDeletedCount} changes.`);

			if (error) throw error;
		}

		logger.info(`compressOldChanges: Finished processing. Done ${doneItemIds.length} items. Deleted: ${totalDeletedCount} changes.`);
	}

	public async save(change: Change, options: SaveOptions = {}): Promise<Change> {
		return super.save(change, options);
	}

	public async deleteByItemIds(itemIds: Uuid[]) {
		if (!itemIds.length) return;

		await this.db(this.tableName)
			.whereIn('item_id', itemIds)
			.delete();
	}

}
