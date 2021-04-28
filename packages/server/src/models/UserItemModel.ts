import { ChangeType, ItemType, UserItem, Uuid } from '../db';
import BaseModel, { DeleteOptions, SaveOptions } from './BaseModel';
import { unique } from '../utils/array';

export interface UserItemDeleteOptions extends DeleteOptions {
	byItemIds?: string[],
	byShareId?: string,
	byUserId?: string;
}

export default class UserItemModel extends BaseModel<UserItem> {

	public get tableName(): string {
		return 'user_items';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async add(userId: Uuid, itemId: Uuid, shareId: Uuid = ''): Promise<UserItem> {
		return this.save({
			user_id: userId,
			item_id: itemId,
			share_id: shareId,
		});
	}

	public async remove(userId: Uuid, itemId: Uuid): Promise<void> {
		await this
			.db(this.tableName)
			.where('user_id', '=', userId)
			.where('item_id', '=', itemId)
			.del();
	}

	public async userIdsByItemIds(itemIds: Uuid[]): Promise<Record<Uuid, Uuid[]>> {
		const rows: UserItem[] = await this.db(this.tableName).select('item_id', 'user_id').whereIn('item_id', itemIds);
		const output: Record<Uuid, Uuid[]> = {};
		for (const row of rows) {
			if (!output[row.item_id]) output[row.item_id] = [];
			output[row.item_id].push(row.user_id);
		}
		return output;
	}

	public async byItemIds(itemIds: Uuid[]): Promise<UserItem[]> {
		return await this.db(this.tableName).select(this.defaultFields).whereIn('item_id', itemIds);
	}

	public async byShareId(shareId: Uuid): Promise<UserItem[]> {
		return await this.db(this.tableName).select(this.defaultFields).where('share_id', '=', shareId);
	}

	public async byUserId(userId: Uuid): Promise<UserItem[]> {
		return this.db(this.tableName).where('user_id', '=', userId);
	}

	public async deleteByItemIds(itemIds: Uuid[]): Promise<void> {
		await this.deleteBy({ byItemIds: itemIds });
		//await this.db(this.tableName).whereIn('item_id', itemIds).delete();
	}

	public async deleteByShareId(shareId: Uuid): Promise<void> {
		await this.deleteBy({ byShareId: shareId });
		// await this.db(this.tableName).where('share_id', '=', shareId).delete();
	}

	public async deleteByUserId(userId: Uuid): Promise<void> {
		await this.deleteBy({ byUserId: userId });
		// await this.db(this.tableName).where('user_id', '=', userId).delete();
	}

	public async save(userItem: UserItem, options: SaveOptions = {}): Promise<UserItem> {
		if (userItem.id) throw new Error('User items cannot be modified (only created or deleted)'); // Sanity check - shouldn't happen

		const item = await this.models().item().load(userItem.item_id, { fields: ['id', 'name'] });
		
		return this.withTransaction(async () => {
			await this.models().change().save({
				item_type: ItemType.UserItem,
				item_id: userItem.item_id,
				item_name: item.name,
				type: ChangeType.Create,
				previous_item: '',
				user_id: userItem.user_id,
			});

			return super.save(userItem, options);
		});
	}

	public async delete(_id: string | string[], _options: DeleteOptions = {}): Promise<void> {
		throw new Error('Use one of the deleteBy methods');
	}

	private async deleteBy(options: UserItemDeleteOptions = {}): Promise<void> {
		let userItems:UserItem[] = []

		if (options.byItemIds) {
			userItems = await this.byItemIds(options.byItemIds);
		} else if (options.byShareId) {
			userItems = await this.byShareId(options.byShareId);
		} else if (options.byUserId) {
			userItems = await this.byUserId(options.byUserId);
		} else {
			throw new Error('Invalid options');
		}

		const itemIds = unique(userItems.map(ui => ui.item_id));
		const items = await this.models().item().loadByIds(itemIds, { fields: ['id', 'name'] });

		await this.withTransaction(async () => {
			for (const userItem of userItems) {
				const item = items.find(i => i.id === userItem.item_id);

				await this.models().change().save({
					item_type: ItemType.UserItem,
					item_id: userItem.item_id,
					item_name: item.name,
					type: ChangeType.Delete,
					previous_item: '',
					user_id: userItem.user_id,
				});
			}
		
			await this.db(this.tableName).whereIn('id', userItems.map(ui => ui.id)).delete();
		}, 'ItemModel::delete');
	}

}
