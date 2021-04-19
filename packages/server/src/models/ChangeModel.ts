import { Change, ChangeType, Item, ItemType, Uuid } from '../db';
import { ErrorResyncRequired } from '../utils/errors';
import BaseModel from './BaseModel';
import { PaginatedResults } from './utils/pagination';

export interface ChangeWithItem {
	item: Item;
	updated_time: number;
	type: ChangeType;
}

export interface PaginatedChanges extends PaginatedResults {
	items: Change[];
}

export interface ChangePagination {
	limit?: number;
	cursor?: string;
}

export function defaultChangePagination(): ChangePagination {
	return {
		limit: 100,
		cursor: '',
	};
}

export default class ChangeModel extends BaseModel<Change> {

	public get tableName(): string {
		return 'changes';
	}

	protected hasUuid(): boolean {
		return true;
	}

	public serializePreviousItem(item: any): string {
		return JSON.stringify(item);
	}

	public unserializePreviousItem(item: string): any {
		if (!item) return null;
		return JSON.parse(item);
	}

	public async add(itemType: ItemType, parentId: Uuid, itemId: Uuid, itemName: string, changeType: ChangeType, previousItem: any, userId: Uuid): Promise<Change> {
		const change: Change = {
			item_type: itemType,
			parent_id: parentId || '',
			item_id: itemId,
			item_name: itemName,
			type: changeType,
			previous_item: previousItem ? this.serializePreviousItem(previousItem) : '',
			user_id: userId,
		};

		return this.save(change) as Change;
	}

	public changeUrl(): string {
		return `${this.baseUrl}/changes`;
	}

	public async allFromId(id: string): Promise<Change[]> {
		const startChange: Change = id ? await this.load(id) : null;
		const query = this.db(this.tableName).select(...this.defaultFields);
		if (startChange) void query.where('counter', '>', startChange.counter);
		void query.limit(1000);
		let results = await query;
		results = await this.removeDeletedItems(results);
		results = await this.compressChanges(results);
		return results;
	}

	// public async allWithPagination(pagination: Pagination): Promise<PaginatedChanges> {
	// 	const results = await paginateDbQuery(this.db(this.tableName).select(...this.defaultFields).where('owner_id', '=', this.userId), pagination);
	// 	const changeWithItems = {}; //await this.loadChangeItemsOld(results.items);
	// 	return {
	// 		...results,
	// 		items: changeWithItems,
	// 		page_count: Math.ceil(await this.countByUser(this.userId) / pagination.limit),
	// 	};
	// }

	public async allForUser(userId:Uuid, pagination: ChangePagination = null): Promise<PaginatedChanges> {
		pagination = {
			...defaultChangePagination(),
			...pagination,
		};

		let changeAtCursor: Change = null;

		if (pagination.cursor) {
			changeAtCursor = await this.load(pagination.cursor) as Change;
			if (!changeAtCursor) throw new ErrorResyncRequired();
		}

		const query = this
			.db('changes')
			.leftJoin('user_items', 'changes.item_id', 'user_items.item_id')
			.select([
				'changes.id',
				'changes.item_id',
				'changes.item_name',
				'changes.type',
				'changes.updated_time',
			])
			.where(function() {
				void this
					.where('user_items.user_id', userId)
					.orWhere('changes.user_id', userId);
			});

		// If a cursor was provided, apply it to both queries.
		if (changeAtCursor) {
			void query.where('counter', '>', changeAtCursor.counter);
		}

		void query
			.orderBy('counter', 'asc')
			.limit(pagination.limit) as any[];

		const changes = await query;

		const compressedChanges = await this.removeDeletedItems(this.compressChanges(changes));

		return {
			items: compressedChanges,
			// If we have changes, we return the ID of the latest changes from which delta sync can resume.
			// If there's no change, we return the previous cursor.
			cursor: changes.length ? changes[changes.length - 1].id : pagination.cursor,
			has_more: changes.length >= pagination.limit,
		};
	}

	private async removeDeletedItems(changes: Change[]): Promise<Change[]> {
		const itemIds = changes.map(c => c.item_id);

		// We skip permission check here because, when an item is shared, we need
		// to fetch files that don't belong to the current user. This check
		// would not be needed anyway because the change items are generated in
		// a context where permissions have already been checked.
		const items: Item[] = await this.db('items').select('id').whereIn('items.id', itemIds);

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

	private compressChanges(changes: Change[]): Change[] {
		const itemChanges: Record<Uuid, Change> = {};

		for (const change of changes) {
			const itemId = change.item_id;
			const previous = itemChanges[itemId];

			if (previous) {
				// create - update => create
				// create - delete => NOOP
				// update - update => update
				// update - delete => delete

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
			} else {
				itemChanges[itemId] = change;
			}
		}

		const output: Change[] = [];

		for (const itemId in itemChanges) {
			output.push(itemChanges[itemId]);
		}

		output.sort((a: Change, b: Change) => a.counter < b.counter ? -1 : +1);

		return output;
	}

}
