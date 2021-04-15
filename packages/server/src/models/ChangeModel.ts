import { Change, ChangeType, File, Item, ItemType, Uuid } from '../db';
import { ErrorResyncRequired, ErrorUnprocessableEntity } from '../utils/errors';
import BaseModel from './BaseModel';
import { paginateDbQuery, PaginatedResults, Pagination } from './utils/pagination';

export interface ChangeWithItemOld {
	item: File;
	updated_time: number;
	type: ChangeType;
}

export interface ChangeWithItem {
	item: Item;
	updated_time: number;
	type: ChangeType;
}

export interface ChangeWithDestFile extends Change {
	dest_file_id: Uuid;
}

export interface PaginatedChangesOld extends PaginatedResults {
	items: ChangeWithItemOld[];
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

	public serializePreviousItem(item:any):string {
		return JSON.stringify(item);
	}

	public unserializePreviousItem(item:string):any {
		if (!item) return null;
		return JSON.parse(item);
	}

	public async add(itemType: ItemType, parentId: Uuid, itemId: Uuid, itemName: string, changeType: ChangeType, previousItem:any): Promise<Change> {
		const change: Change = {
			item_type: itemType,
			parent_id: parentId || '',
			item_id: itemId,
			item_name: itemName,
			type: changeType,
			owner_id: this.userId,
			previous_item: previousItem ? this.serializePreviousItem(previousItem) : '',
		};

		return this.save(change) as Change;
	}

	private async countByUser(userId: string): Promise<number> {
		const r: any = await this.db(this.tableName).where('owner_id', userId).count('id', { as: 'total' }).first();
		return r.total;
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

	public async allWithPagination(pagination: Pagination): Promise<PaginatedChangesOld> {
		const results = await paginateDbQuery(this.db(this.tableName).select(...this.defaultFields).where('owner_id', '=', this.userId), pagination);
		const changeWithItems = await this.loadChangeItemsOld(results.items);
		return {
			...results,
			items: changeWithItems,
			page_count: Math.ceil(await this.countByUser(this.userId) / pagination.limit),
		};
	}

	public async allForUser(pagination: ChangePagination = null): Promise<PaginatedChanges> {
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
			.db('user_items')
			.leftJoin('changes', 'changes.item_id', 'user_items.item_id')
			.select([
				// 'changes.counter',
				'changes.id',
				'changes.item_id',
				'changes.item_name',
				'changes.type',
				'changes.updated_time',
			])
			.where('user_items.user_id', this.userId);

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

	// Note: doesn't currently support checking for changes recursively but this
	// is not needed for Joplin synchronisation.
	public async byDirectoryId(dirId: string, pagination: ChangePagination = null): Promise<PaginatedChangesOld> {
		pagination = {
			...defaultChangePagination(),
			...pagination,
		};

		let changeAtCursor: Change = null;

		if (pagination.cursor) {
			changeAtCursor = await this.load(pagination.cursor) as Change;
			if (!changeAtCursor) throw new ErrorResyncRequired();
		}

		// Load the directory object to check that it exists and that we have
		// the right permissions (loading will check permissions)
		const fileModel = this.models().file({ userId: this.userId });
		const directory = await fileModel.load(dirId);
		if (!directory.is_directory) throw new ErrorUnprocessableEntity(`Item with id "${dirId}" is not a directory.`);

		// Retrieves the IDs of all the files that have been shared with the
		// current user.
		const linkedFilesQuery = this
			.db('files')
			.select('source_file_id')
			.where('source_file_id', '!=', '')
			.andWhere('parent_id', '=', dirId)
			.andWhere('owner_id', '=', this.userId);

		// Retrieves all the changes for the files that belong to the current
		// user.
		const ownChangesQuery = this.db(this.tableName)
			.select([
				'counter',
				'id',
				'item_id',
				'item_name',
				'type',
				this.db.raw('"" as dest_file_id'),
			])
			.where('parent_id', dirId);

		// Retrieves all the changes for the files that have been shared with
		// this user.
		//
		// Each row will have an additional "dest_file_id" property that points
		// to the destination of the link. For example:
		//
		// - User 1 shares a file with ID 123 with user 2.
		// - User 2 get a new file with ID 456 that links to file 123.
		// - User 1 changes file 123
		// - When user 2 retrieves all the changes, they'll get a change for
		//   item_id = 123, and dest_file_id = 456
		//
		// We need this dest_file_id because when sending the list of files, we
		// want to send back metadata for file 456, and not 123, as that belongs
		// to a different user.
		const sharedChangesQuery = this.db(this.tableName)
			.select([
				'counter',
				'changes.id',
				'item_id',
				'item_name',
				'type',
				'files.id as dest_file_id',
			])
			.join('files', 'changes.item_id', 'files.source_file_id')
			.whereIn('changes.item_id', linkedFilesQuery);

		// If a cursor was provided, apply it to both queries.
		if (changeAtCursor) {
			void ownChangesQuery.where('counter', '>', changeAtCursor.counter);
			void sharedChangesQuery.where('counter', '>', changeAtCursor.counter);
		}

		// This will give the list of all changes for shared and not shared
		// files for the provided directory ID. Knexjs TypeScript support seems
		// to be buggy here as it reports that will return `any[][]` so we fix
		// that by forcing `any[]`
		const changesWithDestFile: ChangeWithDestFile[] = await ownChangesQuery
			.union(sharedChangesQuery)
			.orderBy('counter', 'asc')
			.limit(pagination.limit) as any[];

		// Maps dest_file_id to item_id and then the rest of the code can just
		// work without having to check if it's a shared file or not.
		const changes = changesWithDestFile.map(c => {
			if (c.dest_file_id) {
				return { ...c, item_id: c.dest_file_id };
			} else {
				return c;
			}
		});

		const compressedChanges = this.compressChanges(changes);

		const changeWithItems = await this.loadChangeItemsOld(compressedChanges);

		return {
			items: changeWithItems,
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

	private async loadChangeItemsOld(changes: Change[]): Promise<ChangeWithItemOld[]> {
		const itemIds = changes.map(c => c.item_id);

		// We skip permission check here because, when a file is shared, we need
		// to fetch files that don't belong to the current user. This check
		// would not be needed anyway because the change items are generated in
		// a context where permissions have already been checked.
		const items: File[] = await this.models().file().loadByIds(itemIds, { skipPermissionCheck: true });

		const output: ChangeWithItemOld[] = [];

		for (const change of changes) {
			let item = items.find(f => f.id === change.item_id);

			// If the item associated with this change has been deleted, we have
			// two cases:
			// - If it's a "delete" change, add it to the list.
			// - If it's anything else, skip it. The "delete" change will be
			//   sent on one of the next pages.

			if (!item) {
				if (change.type === ChangeType.Delete) {
					item = {
						id: change.item_id,
						name: change.item_name,
					};
				} else {
					continue;
				}
			}

			output.push({
				type: change.type,
				updated_time: change.updated_time,
				item: item,
			});
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
