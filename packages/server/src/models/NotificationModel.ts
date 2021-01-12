import { Notification, NotificationLevel, Uuid } from '../db';
import BaseModel from './BaseModel';

export default class NotificationModel extends BaseModel {

	protected get tableName(): string {
		return 'notifications';
	}

	public async add(key: string, level: NotificationLevel, message: string): Promise<Notification> {
		const n: Notification = await this.loadByKey(key);
		if (n) return n;
		return this.save({ key, message, level, owner_id: this.userId });
	}

	public async markAsRead(key: string): Promise<void> {
		const n = await this.loadByKey(key);
		if (!n) return;

		await this.db(this.tableName)
			.update({ read: 1 })
			.where('key', '=', key)
			.andWhere('owner_id', '=', this.userId);
	}

	public loadByKey(key: string): Promise<Notification> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where('key', '=', key)
			.andWhere('owner_id', '=', this.userId)
			.first();
	}

	public allUnreadByUserId(userId: Uuid): Promise<Notification[]> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where('owner_id', '=', userId)
			.andWhere('read', '=', 0)
			.orderBy('updated_time', 'asc');
	}

	public closeUrl(id: Uuid): string {
		return `${this.baseUrl}/notifications/${id}`;
	}

	public load(id: Uuid): Promise<Notification> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where({ id: id })
			.andWhere('owner_id', '=', this.userId)
			.first();
	}

}
