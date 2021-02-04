import { Change, ChangeType, File, ItemType, Uuid } from '../db';
import { ErrorResyncRequired, ErrorUnprocessableEntity } from '../utils/errors';
import BaseModel from './BaseModel';
import { PaginatedResults } from './utils/pagination';

export interface ChangeWithItem {
	item: File;
	type: ChangeType;
}

export interface ChangeWithDestFile extends Change {
	dest_file_id: Uuid;
}

export interface PaginatedChanges extends PaginatedResults {
	items: ChangeWithItem[];
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
		return false;
	}

	public async add(itemType: ItemType, parentId: Uuid, itemId: Uuid, itemName: string, changeType: ChangeType): Promise<Change> {
		const change: Change = {
			item_type: itemType,
			parent_id: parentId || '',
			item_id: itemId,
			item_name: itemName,
			type: changeType,
			owner_id: this.userId,
		};

		return this.save(change) as Change;
	}

	// Note: doesn't currently support checking for changes recursively but this
	// is not needed for Joplin synchronisation.
	public async byDirectoryId(dirId: string, pagination: ChangePagination = null): Promise<PaginatedChanges> {
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

		// TODO: Restrict query to associated users only
		// TODO: Add indexes
		const linkedFilesSubQuery = this
			.db('files')
			.select('source_file_id')
			.where('source_file_id', '!=', '')
			.andWhere('parent_id', '=', dirId)
			.andWhere('owner_id', '=', this.userId);

		// Rather than query the changes, then use JS to compress them, it might
		// be possible to do both in one query.
		// https://stackoverflow.com/questions/65348794
		const ownItemsQuery = this.db(this.tableName)
			.select([
				'counter',
				'id',
				'item_id',
				'item_name',
				'type',
				this.db.raw('"" as dest_file_id'),
			])
			.where('parent_id', dirId);

		const shareQuery = this.db(this.tableName)
			.select([
				'counter',
				'changes.id',
				'item_id',
				'item_name',
				'type',
				'files.id as dest_file_id',
			])
			.join('files', 'changes.item_id', 'files.source_file_id')
			.whereIn('changes.item_id', linkedFilesSubQuery);

		if (changeAtCursor) {
			void ownItemsQuery.where('counter', '>', changeAtCursor.counter);
			void shareQuery.where('counter', '>', changeAtCursor.counter);
		}

		const unionQuery = ownItemsQuery
			.union(shareQuery)
			.orderBy('counter', 'asc')
			.limit(pagination.limit);

		const changesWithDestFile: ChangeWithDestFile[] = (await unionQuery) as any[];

		const changes = changesWithDestFile.map(c => {
			if (c.dest_file_id) {
				return { ...c, item_id: c.dest_file_id };
			} else {
				return c;
			}
		});

		const compressedChanges = this.compressChanges(changes);
		const changeWithItems = await this.loadChangeItems(compressedChanges);

		return {
			items: changeWithItems,
			// If we have changes, we return the ID of the latest changes from which delta sync can resume.
			// If there's no change, we return the previous cursor.
			cursor: changes.length ? changes[changes.length - 1].id : pagination.cursor,
			has_more: changes.length >= pagination.limit,
		};
	}

	private async loadChangeItems(changes: Change[]): Promise<ChangeWithItem[]> {
		const itemIds = changes.map(c => c.item_id);

		// We skip permission check here because, when a file is shared, we need
		// to fetch files that don't belong to the current user. This check
		// would not be needed anyway because the change items are generated in
		// a context where permissions have already been checked.
		const items: File[] = await this.models().file().loadByIds(itemIds, { skipPermissionCheck: true });

		const output: ChangeWithItem[] = [];

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
