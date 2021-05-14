import { Notification, NotificationLevel, Uuid } from '../db';
import { ErrorUnprocessableEntity } from '../utils/errors';
import BaseModel, { ValidateOptions } from './BaseModel';

export default class NotificationModel extends BaseModel<Notification> {

	protected get tableName(): string {
		return 'notifications';
	}

	protected async validate(notification: Notification, options: ValidateOptions = {}): Promise<Notification> {
		if ('owner_id' in notification && !notification.owner_id) throw new ErrorUnprocessableEntity('Missing owner_id');
		return super.validate(notification, options);
	}

	public async add(userId: Uuid, key: string, level: NotificationLevel, message: string): Promise<Notification> {
		const n: Notification = await this.loadByKey(userId, key);
		if (n) return n;
		return this.save({ key, message, level, owner_id: userId });
	}

	public async markAsRead(userId: Uuid, key: string): Promise<void> {
		const n = await this.loadByKey(userId, key);
		if (!n) return;

		await this.db(this.tableName)
			.update({ read: 1 })
			.where('key', '=', key)
			.andWhere('owner_id', '=', userId);
	}

	public loadByKey(userId: Uuid, key: string): Promise<Notification> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where('key', '=', key)
			.andWhere('owner_id', '=', userId)
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
			.first();
	}

	public async deleteByUserId(userId: Uuid) {
		await this.db(this.tableName).where('owner_id', '=', userId).delete();
	}

}
