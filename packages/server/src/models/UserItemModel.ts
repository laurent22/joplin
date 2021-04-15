import { UserItem, Uuid } from '../db';
import BaseModel from './BaseModel';

export default class UserItemModel extends BaseModel<UserItem> {

	public get tableName(): string {
		return 'user_items';
	}

	protected hasUuid(): boolean {
		return false;
	}

	private async userHasItem(userId:Uuid, itemId:Uuid):Promise<boolean> {
		const r = await this
			.db(this.tableName)
			.select('id')
			.where('user_id', '=', userId)
			.where('item_id', '=', itemId)
			.first();
		return !!r;
	}

	public async add(userId: Uuid, itemId: Uuid): Promise<UserItem> {
		return this.save({
			user_id: userId,
			item_id: itemId,
		});
	}

	public async remove(userId: Uuid, itemId: Uuid): Promise<void> {
		await this
			.db(this.tableName)
			.where('user_id', '=', userId)
			.where('item_id', '=', itemId)
			.del();
	}

}
