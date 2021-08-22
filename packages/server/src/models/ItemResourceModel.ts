import { resourceBlobPath } from '../utils/joplinUtils';
import { Item, ItemResource, Uuid } from '../services/database/types';
import BaseModel from './BaseModel';

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
		});
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

	public async blobItemsByResourceIds(userIds: Uuid[], resourceIds: string[]): Promise<Item[]> {
		const resourceBlobNames = resourceIds.map(id => resourceBlobPath(id));
		return this.models().item().loadByNames(userIds, resourceBlobNames);
	}

}
