import { DbConnection } from '../../db';
import { unique } from '../../utils/array';
import { ChangeType, Item, Uuid } from '../database/types';

export interface Options {
	interval: number;
	batchSize?: number;
}

export default async (db: DbConnection, options: Options = null) => {
	options = {
		batchSize: 10000,
		...options,
	};

	const cutOffTime = Date.now() - options.interval;

	interface ChangeSlice {
		user_id: Uuid;
		updated_time: number;
		counter: number;
		type: ChangeType;
		item_id: Uuid;
	}

	interface GroupedChange {
		user_id: Uuid;
		total_count: number;
		create_count: number;
		update_count: number;
		delete_count: number;
		uploaded_size: number;
	}

	type ItemSlice = Pick<Item, 'content_size' | 'id'>;

	let changes: ChangeSlice[] = [];
	let counter = 0;

	while (true) {
		const query = db('changes')
			.select('user_id', 'updated_time', 'counter', 'item_id', 'type')
			.orderBy('counter', 'desc')
			.limit(options.batchSize);

		if (counter > 0) void query.where('counter', '<', counter);

		const results: ChangeSlice[] = await query;

		if (!results.length) break;

		const filteredResults = results.filter(row => row.updated_time >= cutOffTime);

		changes = changes.concat(filteredResults);

		if (filteredResults.length !== results.length) break;

		counter = filteredResults[filteredResults.length - 1].counter;
	}

	const itemIds = unique(changes.map(c => c.item_id));

	const items: ItemSlice[] = await db('items')
		.select('id', 'content_size')
		.whereIn('id', itemIds);

	const groupedChanges: GroupedChange[] = [];

	for (const c of changes) {
		let grouped = groupedChanges.find(g => g.user_id === c.user_id);
		if (!grouped) {
			grouped = {
				user_id: c.user_id,
				total_count: 0,
				create_count: 0,
				update_count: 0,
				delete_count: 0,
				uploaded_size: 0,
			};

			groupedChanges.push(grouped);
		}

		if (c.type === ChangeType.Create) grouped.create_count++;
		if (c.type === ChangeType.Update) grouped.update_count++;
		if (c.type === ChangeType.Delete) grouped.delete_count++;
		grouped.total_count++;

		const item = items.find(it => it.id === c.item_id);
		if (item) {
			if ([ChangeType.Create, ChangeType.Update].includes(c.type)) {
				grouped.uploaded_size += item.content_size;
			}
		}

		if (!itemIds.includes(c.item_id)) itemIds.push(c.item_id);
	}

	groupedChanges.sort((a, b) => {
		if (a.total_count > b.total_count) return -1;
		if (a.total_count < b.total_count) return +1;
		return 0;
	});

	return groupedChanges;
};
