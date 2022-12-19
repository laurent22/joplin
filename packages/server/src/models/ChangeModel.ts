import { Knex } from 'knex';
import Logger from '@joplin/lib/Logger';
import { SqliteMaxVariableNum } from '../db';
import { Change, ChangeType, Item, Uuid } from '../services/database/types';
import { md5 } from '../utils/crypto';
import { ErrorResyncRequired } from '../utils/errors';
import { Day, formatDateTime } from '../utils/time';
import BaseModel, { SaveOptions } from './BaseModel';
import { PaginatedResults, Pagination, PaginationOrderDir } from './utils/pagination';

const logger = Logger.create('ChangeModel');

export const defaultChangeTtl = 180 * Day;

export interface DeltaChange extends Change {
	jop_updated_time?: number;
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
		limit: 100,
		cursor: '',
	};
}

export function requestDeltaPagination(query: any): ChangePagination {
	if (!query) return defaultDeltaPagination();

	const output: ChangePagination = {};
	if ('limit' in query) output.limit = query.limit;
	if ('cursor' in query) output.cursor = query.cursor;
	return output;
}

export default class ChangeModel extends BaseModel<Change> {

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

	private changesForUserQuery(userId: Uuid, count: boolean): Knex.QueryBuilder {
		// When need to get:
		//
		// - All the CREATE and DELETE changes associated with the user
		// - All the UPDATE changes that applies to items associated with the
		//   user.
		//
		// UPDATE changes do not have the user_id set because they are specific
		// to the item, not to a particular user.

		const query = this
			.db('changes')
			.where(function() {
				void this.whereRaw('((type = ? OR type = ?) AND user_id = ?)', [ChangeType.Create, ChangeType.Delete, userId])
					// Need to use a RAW query here because Knex has a "not a
					// bug" bug that makes it go into infinite loop in some
					// contexts, possibly only when running inside Jest (didn't
					// test outside).
					// https://github.com/knex/knex/issues/1851
					.orWhereRaw('type = ? AND item_id IN (SELECT item_id FROM user_items WHERE user_id = ?)', [ChangeType.Update, userId]);
			});

		if (count) {
			void query.countDistinct('id', { as: 'total' });
		} else {
			void query.select([
				'id',
				'item_id',
				'item_name',
				'type',
				'updated_time',
			]);
		}

		return query;
	}

	public async allByUser(userId: Uuid, pagination: Pagination = null): Promise<PaginatedDeltaChanges> {
		pagination = {
			page: 1,
			limit: 100,
			order: [{ by: 'counter', dir: PaginationOrderDir.ASC }],
			...pagination,
		};

		const query = this.changesForUserQuery(userId, false);
		const countQuery = this.changesForUserQuery(userId, true);
		const itemCount = (await countQuery.first()).total;

		void query
			.orderBy(pagination.order[0].by, pagination.order[0].dir)
			.offset((pagination.page - 1) * pagination.limit)
			.limit(pagination.limit) as any[];

		const changes = await query;

		return {
			items: changes,
			// If we have changes, we return the ID of the latest changes from which delta sync can resume.
			// If there's no change, we return the previous cursor.
			cursor: changes.length ? changes[changes.length - 1].id : pagination.cursor,
			has_more: changes.length >= pagination.limit,
			page_count: itemCount !== null ? Math.ceil(itemCount / pagination.limit) : undefined,
		};
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

		const query = this.changesForUserQuery(userId, false);

		// If a cursor was provided, apply it to the query.
		if (changeAtCursor) {
			void query.where('counter', '>', changeAtCursor.counter);
		}

		void query
			.orderBy('counter', 'asc')
			.limit(pagination.limit) as any[];

		const changes: Change[] = await query;

		const items: Item[] = await this.db('items').select('id', 'jop_updated_time').whereIn('items.id', changes.map(c => c.item_id));

		let processedChanges = this.compressChanges(changes);
		processedChanges = await this.removeDeletedItems(processedChanges, items);

		const finalChanges: DeltaChange[] = processedChanges.map(c => {
			const item = items.find(item => item.id === c.item_id);
			if (!item) return c;
			return {
				...c,
				jop_updated_time: item.jop_updated_time,
			};
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
		const savedChange = await super.save(change, options);
		ChangeModel.eventEmitter.emit('saved');
		return savedChange;
	}

	public async deleteByItemIds(itemIds: Uuid[]) {
		if (!itemIds.length) return;

		await this.db(this.tableName)
			.whereIn('item_id', itemIds)
			.delete();
	}

}
