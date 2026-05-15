import { DbConnection, SqliteMaxVariableNum } from '../../db';
import { ChangeType, Uuid, ItemType, Change2, Item, Change } from '../../services/database/types';
import { PaginatedResults } from '../utils/pagination';
import { NewModelFactoryHandler } from '../factory';
import { Config } from '../../utils/types';
import ChangeModelOld from './ChangeModel.old';
import ChangeModelNew from './ChangeModel.new';
import BaseModel, { LoadOptions } from '../BaseModel';
import { ErrorResyncRequired } from '../../utils/errors';
import Logger from '@joplin/utils/Logger';

export { defaultChangeTtl } from './BaseChangeModel';

const logger = Logger.create('ChangeModel/index');

export interface DeltaChange extends Change2 {
	jop_updated_time?: number;
}

export type PaginatedDeltaChanges = PaginatedResults<DeltaChange>;

export type PaginatedChanges = PaginatedResults<Change2>;

export interface ChangePagination {
	limit?: number;
	cursor?: string;
}

export interface ChangePreviousItem {
	jop_share_id: string;
}

export interface RecordChangeOptions {
	itemName: string;
	itemId: Uuid;
	sourceUserId: Uuid;
	shareId: Uuid|'';
	previousItem: ChangePreviousItem;
	type: ChangeType;
	itemType: ItemType;
}


export function defaultDeltaPagination(): ChangePagination {
	return {
		limit: 200,
		cursor: '',
	};
}

export function requestDeltaPagination(query: ChangePagination | null): ChangePagination {
	if (!query) return defaultDeltaPagination();

	const output: ChangePagination = {};
	if ('limit' in query) output.limit = query.limit;
	if ('cursor' in query) output.cursor = query.cursor;
	return output;
}

const oldToNewChange = (change: Change): Change2 => {
	const previousShareId = change.previous_item ? JSON.parse(change.previous_item)?.jop_share_id : '';

	const result = {
		...change,
		previous_share_id: previousShareId,
	};
	// previous_item is only a property on legacy changes:
	delete result.previous_item;
	return result;
};

const oldToNewChanges = (changes: Change[]) => {
	return changes.map(oldToNewChange);
};

export default class ChangeModel extends BaseModel<Change2> {

	private oldModel_: ChangeModelOld;
	private newModel_: ChangeModelNew;

	public constructor(db: DbConnection, dbSlave: DbConnection, modelFactory: NewModelFactoryHandler, private config: Config) {
		super(db, dbSlave, modelFactory, config);

		this.oldModel_ = new ChangeModelOld(db, dbSlave, modelFactory, config);
		this.newModel_ = new ChangeModelNew(db, dbSlave, modelFactory, config);
	}

	public get tableName(): string {
		return this.newModel_.tableName;
	}

	protected hasUuid(): boolean {
		return true;
	}

	public changeUrl(): string {
		return `${this.config.baseUrl}/changes`;
	}

	public async allFromId(id: string, limit: number = SqliteMaxVariableNum): Promise<PaginatedChanges> {
		// Only load old changes if not starting from a point within the new changes list.
		// If the change is not found by oldModel_ (e.g. because the change is in changes_2),
		// it will return **all** old changes.
		const includeOldChanges = !id || !await this.newModel_.load(id, { fields: ['id'] });

		let results: Change2[] = [];
		if (includeOldChanges) {
			results = oldToNewChanges(
				await this.oldModel_.allFromId(id, limit),
			);
		}

		if (results.length < limit) {
			const newResults = await this.newModel_.allFromId(id, limit - results.length);
			results = results.concat(newResults);
		}

		const hasMore = !!results.length;
		const cursor = results.length ? results[results.length - 1].id : id;
		results = await this.removeDeletedItems(results);
		// We can't compress changes here, since compressChanges_ assumes:
		// - that all changes are for the same user, which isn't the case here
		// - create -> delete can be compressed to a no-op, which isn't always true when processing
		//   all changes.
		//
		// results = await this.compressChanges_(results);
		return {
			items: results,
			has_more: hasMore,
			cursor,
		};
	}

	public async count() {
		return await this.oldModel_.count() + await this.newModel_.count();
	}

	public async all() {
		return oldToNewChanges(await this.oldModel_.all())
			.concat(await this.newModel_.all());
	}

	public async load(id: Uuid, options?: LoadOptions) {
		let change = await this.newModel_.load(id, options);

		if (!change) {
			const oldChange = await this.oldModel_.load(id, options);
			if (oldChange) {
				change = oldToNewChange(oldChange);
			}
		}

		return change;
	}

	// Public for testing
	public async changesForUserQuery(userId: Uuid, fromCounter: number, limit: number, doCountQuery: boolean): Promise<Change2[]> {
		const firstNewChange = await this.newModel_.first({ fields: ['counter'] });

		let changes: Change2[] = [];
		const startInOldTable = !firstNewChange || fromCounter < firstNewChange.counter;
		if (startInOldTable) {
			changes = oldToNewChanges(await this.oldModel_.changesForUserQuery(userId, fromCounter, limit, doCountQuery));
		}

		if (changes.length < limit) {
			const newChanges = await this.newModel_.changesForUserQuery(userId, fromCounter, limit - changes.length, doCountQuery);

			const firstNewChange = newChanges[0];
			const lastOldChange = changes[changes.length - 1];
			if (firstNewChange && lastOldChange && lastOldChange.counter >= firstNewChange.counter) {
				// Shouldn't happen
				logger.warn('Bad counter: The last old change has a greater counter than the first new change');
			}

			changes = changes.concat(newChanges);
		}

		return changes;
	}

	public async delta(userId: Uuid, pagination: ChangePagination = null): Promise<PaginatedDeltaChanges> {
		pagination = {
			...defaultDeltaPagination(),
			...pagination,
		};

		let changeAtCursor: Change2 = null;

		if (pagination.cursor) {
			changeAtCursor = await this.load(pagination.cursor);
			if (!changeAtCursor) throw new ErrorResyncRequired();
		}

		const changes = await this.changesForUserQuery(
			userId,
			changeAtCursor ? changeAtCursor.counter : -1,
			pagination.limit,
			false,
		);

		const items: Item[] = await this.db('items').select('id', 'jop_updated_time').whereIn('items.id', changes.map(c => c.item_id));

		let processedChanges = this.compressChanges_(changes);
		processedChanges = await this.removeDeletedItems(processedChanges, items);

		const finalChanges = processedChanges.map(change => {
			change = { ...change };
			// change.counter is used only for ordering the results and can be removed
			// from API output:
			delete change.counter;

			return change;
		}).map(change => {
			const item = items.find(item => item.id === change.item_id);
			if (!item) return change;

			const deltaChange: DeltaChange = {
				...change,
				jop_updated_time: item.jop_updated_time,
			};
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

	private async removeDeletedItems(changes: Change2[], items: Item[] = null): Promise<Change2[]> {
		const itemIds = changes.map(c => c.item_id);

		// We skip permission check here because, when an item is shared, we need
		// to fetch files that don't belong to the current user. This check
		// would not be needed anyway because the change items are generated in
		// a context where permissions have already been checked.
		items = items === null ? await this.db('items').select('id').whereIn('items.id', itemIds) : items;

		const output: Change2[] = [];

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
	//     create - delete => delete
	//     update - update => update
	//     update - delete => delete
	//     delete - create => create
	//
	// There's one exception for changes that include a "previous_item". This is
	// used to save specific properties about the previous state of the item,
	// such as "jop_share_id" or "name". The share mechanism needs to know about
	// each change to "jop_share_id", so updates that change the share ID are not
	// compressed.
	//
	// The latest change, when an item goes from DELETE to CREATE seems odd but
	// can happen because we are not checking for "item" changes but for
	// "user_item" changes. When sharing is involved, an item can be shared
	// (CREATED), then unshared (DELETED), then shared again (CREATED). When it
	// happens, we want the user to get the item, thus we generate a CREATE
	// event.
	//
	// Public to allow testing.
	public compressChanges_(changes: Change2[]): Change2[] {
		const itemChanges = new Map<Uuid, Change2>();

		const itemUniqueUpdates = new Map<Uuid, Change2[]>();
		const itemToLastUpdateShareIds = new Map<Uuid, Uuid>();

		const changeToShareId = (change: Change2) => {
			return change.previous_share_id;
		};

		for (const change of changes) {
			const itemId = change.item_id;
			const previous = itemChanges.get(itemId);

			if (change.type === ChangeType.Update) {
				const shareId = changeToShareId(change);

				const uniqueUpdates = itemUniqueUpdates.get(itemId);
				if (uniqueUpdates) {
					const lastShareId = itemToLastUpdateShareIds.get(itemId);
					const canCompress = lastShareId === shareId;

					if (canCompress) {
						// Always keep the last change as up-to-date as possible
						uniqueUpdates[uniqueUpdates.length - 1] = change;
					} else {
						uniqueUpdates.push(change);
						itemToLastUpdateShareIds.set(itemId, shareId);
					}
				} else {
					itemUniqueUpdates.set(itemId, [change]);
					itemToLastUpdateShareIds.set(itemId, shareId);
				}
			}

			if (previous) {
				if (previous.type === ChangeType.Create && change.type === ChangeType.Update) {
					continue;
				}

				if (previous.type === ChangeType.Create && change.type === ChangeType.Delete) {
					itemChanges.set(itemId, change);
				}

				if (previous.type === ChangeType.Update && change.type === ChangeType.Update) {
					itemChanges.set(itemId, change);
				}

				if (previous.type === ChangeType.Update && change.type === ChangeType.Delete) {
					itemChanges.set(itemId, change);
				}

				if (previous.type === ChangeType.Delete && change.type === ChangeType.Create) {
					itemChanges.set(itemId, change);
				}
			} else {
				itemChanges.set(itemId, change);
			}
		}

		const output: Change2[] = [];

		for (const [itemId, change] of itemChanges) {
			if (change.type === ChangeType.Update) {
				for (const otherChange of itemUniqueUpdates.get(itemId)) {
					output.push(otherChange);
				}
			} else {
				output.push(change);
			}
		}

		output.sort((a: Change2, b: Change2) => a.counter < b.counter ? -1 : +1);

		return output;
	}

	public async compressOldChanges(ttl: number = null) {
		await this.oldModel_.compressOldChanges(ttl);
		await this.newModel_.compressOldChanges(ttl);
	}

	public async deleteByItemIds(itemIds: Uuid[]) {
		await this.oldModel_.deleteByItemIds(itemIds);
		await this.newModel_.deleteByItemIds(itemIds);
	}

	public async recordChange(options: RecordChangeOptions) {
		await this.newModel_.recordChange(options);
	}

}
