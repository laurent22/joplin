import { Change, ChangeType, ItemType, Uuid } from '../db';
import { ErrorResyncRequired } from '../utils/errors';
import BaseModel from './BaseModel';
import { PaginatedResults } from './utils/pagination';

export interface PaginatedChanges extends PaginatedResults {
	items: Change[];
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

	// changes by directory

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

		const items: Change[] = await query;

		return {
			items: this.compressChanges(items),
			cursor: items.length ? items[items.length - 1].id : '',
			has_more: items.length >= pagination.limit,
		};
	}

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
