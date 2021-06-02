import { Notification, NotificationLevel, Uuid } from '../db';
import { ErrorUnprocessableEntity } from '../utils/errors';
import BaseModel, { ValidateOptions } from './BaseModel';

export enum NotificationKey {
	ConfirmEmail = 'confirmEmail',
	PasswordSet = 'passwordSet',
	EmailConfirmed = 'emailConfirmed',
	ChangeAdminPassword = 'change_admin_password',
	UsingSqliteInProd = 'using_sqlite_in_prod',
}

interface NotificationType {
	level: NotificationLevel;
	message: string;
}

const notificationTypes: Record<string, NotificationType> = {
	[NotificationKey.ConfirmEmail]: {
		level: NotificationLevel.Normal,
		message: 'Welcome to Joplin Server! An email has been sent to you containing an activation link to complete your registration.',
	},
	[NotificationKey.EmailConfirmed]: {
		level: NotificationLevel.Normal,
		message: 'You email has been confirmed',
	},
	[NotificationKey.PasswordSet]: {
		level: NotificationLevel.Normal,
		message: 'Welcome to Joplin Server! Your password has been set successfully.',
	},
	[NotificationKey.UsingSqliteInProd]: {
		level: NotificationLevel.Important,
		message: 'The server is currently using SQLite3 as a database. It is not recommended in production as it is slow and can cause locking issues. Please see the README for information on how to change it.',
	},
};

export default class NotificationModel extends BaseModel<Notification> {

	protected get tableName(): string {
		return 'notifications';
	}

	protected async validate(notification: Notification, options: ValidateOptions = {}): Promise<Notification> {
		if ('owner_id' in notification && !notification.owner_id) throw new ErrorUnprocessableEntity('Missing owner_id');
		return super.validate(notification, options);
	}

	public async add(userId: Uuid, key: NotificationKey, level: NotificationLevel = null, message: string = null): Promise<Notification> {
		const n: Notification = await this.loadByKey(userId, key);
		if (n) return n;

		const type = notificationTypes[key];

		if (level === null) {
			if (type?.level) {
				level = type.level;
			} else {
				throw new Error('Missing notification level');
			}
		}

		if (message === null) {
			if (type?.message) {
				message = type.message;
			} else {
				throw new Error('Missing notification message');
			}
		}

		return this.save({ key, message, level, owner_id: userId });
	}

	public async markAsRead(userId: Uuid, key: NotificationKey): Promise<void> {
		const n = await this.loadByKey(userId, key);
		if (!n) return;

		await this.db(this.tableName)
			.update({ read: 1 })
			.where('key', '=', key)
			.andWhere('owner_id', '=', userId);
	}

	public loadByKey(userId: Uuid, key: NotificationKey): Promise<Notification> {
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
