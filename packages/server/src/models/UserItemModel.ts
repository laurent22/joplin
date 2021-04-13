import { UserItem, Uuid } from '../db';
import BaseModel from './BaseModel';

export default class UserItemModel extends BaseModel<UserItem> {

	public get tableName(): string {
		return 'user_items';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async add(userId: Uuid, itemId: Uuid): Promise<UserItem> {
		return this.save({
			user_id: userId,
			item_id: itemId,
		});
	}

}
