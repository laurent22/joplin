import { Change, ChangeType, File, ItemType, Uuid } from '../db';
import { ErrorResyncRequired } from '../utils/errors';
import BaseModel from './BaseModel';
import { PaginatedResults } from './utils/pagination';

export interface ChangeWithItem {
	item: File;
	type: ChangeType;
}

export interface PaginatedChanges extends PaginatedResults {
	items: ChangeWithItem[];
}

export interface ChangePagination {
	limit?: number;
	cursor?: string;
}

export default class ChangeModel extends BaseModel {

	public get tableName(): string {
		return 'changes';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async add(itemType: ItemType, itemId: Uuid, changeType: ChangeType): Promise<Change> {
		const change: Change = {
			item_type: itemType,
			item_id: itemId,
			type: changeType,
			owner_id: this.userId,
		};

		return this.save(change);
	}

	// Ideally we should watch changes in a particular directory, however doing
	// so means we need to recursively get all the changes, also while making
	// sure permissions are right. So for now, we just get all the changes for a
	// particular user.
	public async byOwnerId(ownerId: string, pagination: ChangePagination): Promise<PaginatedChanges> {
		pagination = {
			limit: 100,
			cursor: '',
			...pagination,
		};

		let changeAtCursor: Change = null;

		if (pagination.cursor) {
			changeAtCursor = await this.load(pagination.cursor);
			if (!changeAtCursor) throw new ErrorResyncRequired();
		}

		// Rather than query the changes, then use JS to compress them, it might
		// be possible to do both in one query.
		// https://stackoverflow.com/questions/65348794
		const query = this.db(this.tableName)
			.select([
				'counter',
				'id',
				'item_id',
				'type',
			])
			.where('owner_id', ownerId)
			.orderBy('counter', 'asc')
			.limit(pagination.limit);

		if (changeAtCursor) {
			void query.where('counter', '>', changeAtCursor.counter);
		}

		const changes: Change[] = await query;
		const compressedChanges = this.compressChanges(changes);
		const changeWithItems = await this.loadChangeItems(compressedChanges);

		return {
			items: changeWithItems,
			cursor: changes.length ? changes[changes.length - 1].id : '',
			has_more: changes.length >= pagination.limit,
		};
	}

	private async loadChangeItems(changes: Change[]): Promise<ChangeWithItem[]> {
		const itemIds = changes.map(c => c.item_id);
		const items: File[] = await this.db('files').select('*').whereIn('id', itemIds);

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
					item = { id: change.item_id };
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

	// public async byParentId(parentId: string, pagination: ChangePagination): Promise<PaginatedChanges> {
	// 	pagination = {
	// 		limit: 100,
	// 		cursor: '',
	// 		...pagination,
	// 	};

	// 	// Try to load the parent directory, which would throw an exception if
	// 	// the user doesn't have access to it.
	// 	const fileModel = await this.models.file({ userId: this.userId });
	// 	const directory = await fileModel.load(parentId);

	// 	// TODO: test
	// 	if (!directory.is_directory) throw new ErrorUnprocessableEntity('Item with id "' + parentId + '" is not a directory.');

	// 	let changeAtCursor: Change = null;

	// 	if (pagination.cursor) {
	// 		changeAtCursor = await this.load(pagination.cursor);
	// 		if (!changeAtCursor) throw new ErrorResyncRequired();
	// 	}

	// 	// Rather than query the changes, then use JS to compress them, it might
	// 	// be possible to do both in one query.
	// 	// https://stackoverflow.com/questions/65348794
	// 	const query = this.db(this.tableName)
	// 		.select([
	// 			'counter',
	// 			'id',
	// 			'item_id',
	// 			'type',
	// 		])
	// 		.where('parent_id', parentId)
	// 		.orderBy('counter', 'asc')
	// 		.limit(pagination.limit);

	// 	if (changeAtCursor) {
	// 		void query.where('counter', '>', changeAtCursor.counter);
	// 	}

	// 	const items: Change[] = await query;

	// 	return {
	// 		items: this.compressChanges(items),
	// 		cursor: items.length ? items[items.length - 1].id : '',
	// 		has_more: items.length >= pagination.limit,
	// 	};
	// }

	private compressChanges(changes: Change[]): Change[] {
		const itemChanges: Record<Uuid, Change> = {};

		for (const change of changes) {
			const previous = itemChanges[change.item_id];

			if (previous) {
				// create - update => create
				// create - delete => NOOP
				// update - update => update
				// update - delete => delete

				if (previous.type === ChangeType.Create && change.type === ChangeType.Update) {
					continue;
				}

				if (previous.type === ChangeType.Create && change.type === ChangeType.Delete) {
					delete itemChanges[change.item_id];
				}

				if (previous.type === ChangeType.Update && change.type === ChangeType.Update) {
					itemChanges[change.item_id] = change;
				}

				if (previous.type === ChangeType.Update && change.type === ChangeType.Delete) {
					itemChanges[change.item_id] = change;
				}
			} else {
				itemChanges[change.item_id] = change;
			}
		}

		const output = [];

		for (const itemId in itemChanges) {
			output.push(itemChanges[itemId]);
		}

		output.sort((a: Change, b: Change) => a.counter < b.counter ? -1 : +1);

		return output;
	}

}
