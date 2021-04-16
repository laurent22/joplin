import { UserItem, Uuid } from '../db';
import BaseModel from './BaseModel';

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

	public async deleteByItemIds(itemIds: Uuid[]): Promise<void> {
		await this.db(this.tableName).whereIn('item_id', itemIds).delete();
	}

	public async deleteByShareId(shareId: Uuid): Promise<void> {
		await this.db(this.tableName).where('share_id', '=', shareId).delete();
	}

}
