import { ItemResource, Uuid } from '../db';
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
		return this.db(this.tableName).pluck('resource_id').where('item_id', '=', itemId);
	}

}
