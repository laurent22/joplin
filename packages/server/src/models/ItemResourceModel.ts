import { resourceBlobPath } from '../utils/joplinUtils';
import { Item, ItemResource, Uuid } from '../services/database/types';
import BaseModel from './BaseModel';

export interface TreeItem {
	item_id: Uuid;
	resource_id: string;
	children: TreeItem[];
}

export default class ItemResourceModel extends BaseModel<ItemResource> {

	public get tableName(): string {
		return 'item_resources';
	}

	protected hasUuid(): boolean {
		return false;
	}

	protected autoTimestampEnabled(): boolean {
		return false;
	}

	public async deleteByItemIds(itemIds: Uuid[]): Promise<void> {
		await this.db(this.tableName).whereIn('item_id', itemIds).delete();
	}

	public async deleteByItemId(itemId: Uuid): Promise<void> {
		await this.deleteByItemIds([itemId]);
	}

	public async addResourceIds(itemId: Uuid, resourceIds: string[]): Promise<void> {
		if (!resourceIds.length) return;

		await this.withTransaction(async () => {
			for (const resourceId of resourceIds) {
				await this.save({
					item_id: itemId,
					resource_id: resourceId,
				});
			}
		}, 'ItemResourceModel::addResourceIds');
	}

	public async byItemId(itemId: Uuid): Promise<string[]> {
		const r = await this.byItemIds([itemId]);
		return Object.keys(r).length ? r[itemId] : [];
	}

	public async byItemIds(itemIds: Uuid[]): Promise<Record<Uuid, string[]>> {
		const rows: ItemResource[] = await this.db(this.tableName).select('item_id', 'resource_id').whereIn('item_id', itemIds);
		const output: Record<Uuid, string[]> = {};
		for (const row of rows) {
			if (!output[row.item_id]) output[row.item_id] = [];
			output[row.item_id].push(row.resource_id);
		}
		return output;
	}

	public async itemIdsByResourceId(resourceId: string): Promise<string[]> {
		const rows: ItemResource[] = await this.db(this.tableName).select('item_id').where('resource_id', '=', resourceId);
		return rows.map(r => r.item_id);
	}

	public async blobItemsByResourceIds(userIds: Uuid[], resourceIds: string[]): Promise<Item[]> {
		const resourceBlobNames = resourceIds.map(id => resourceBlobPath(id));
		return this.models().item().loadByNames(userIds, resourceBlobNames);
	}

	public async itemTree(rootItemId: Uuid, rootJopId: string, currentItemIds: string[] = []): Promise<TreeItem> {
		interface Row {
			id: Uuid;
			jop_id: string;
		}

		const rows: Row[] = await this
			.db('item_resources')
			.leftJoin('items', 'item_resources.resource_id', 'items.jop_id')
			.select('items.id', 'items.jop_id')
			.where('item_resources.item_id', '=', rootItemId);

		const output: TreeItem[] = [];

		// Only process the children if the parent ID is not already in the
		// tree. This is to prevent an infinite loop if one of the leaves links
		// to a descendant note.

		if (!currentItemIds.includes(rootJopId)) {
			currentItemIds.push(rootJopId);

			for (const row of rows) {
				const subTree = await this.itemTree(row.id, row.jop_id, currentItemIds);

				output.push({
					item_id: row.id,
					resource_id: row.jop_id,
					children: subTree.children,
				});
			}
		}

		return {
			item_id: rootItemId,
			resource_id: rootJopId,
			children: output,
		};
	}

}
