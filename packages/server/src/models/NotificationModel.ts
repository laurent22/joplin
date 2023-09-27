import { Notification, NotificationLevel, Uuid } from '../services/database/types';
import { ErrorUnprocessableEntity } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import BaseModel, { ValidateOptions } from './BaseModel';

export enum NotificationKey {
	Any = 'any',
	// ConfirmEmail = 'confirmEmail',
	PasswordSet = 'passwordSet',
	EmailConfirmed = 'emailConfirmed',
	ChangeAdminPassword = 'change_admin_password',
	// UsingSqliteInProd = 'using_sqlite_in_prod',
	UpgradedToPro = 'upgraded_to_pro',
}

interface NotificationType {
	level: NotificationLevel;
	message: string;
}

export default class NotificationModel extends BaseModel<Notification> {

	protected get tableName(): string {
		return 'notifications';
	}

	protected async validate(notification: Notification, options: ValidateOptions = {}): Promise<Notification> {
		if ('owner_id' in notification && !notification.owner_id) throw new ErrorUnprocessableEntity('Missing owner_id');
		return super.validate(notification, options);
	}

	public async add(userId: Uuid, key: NotificationKey, level: NotificationLevel = null, message: string = null): Promise<Notification> {
		const notificationTypes: Record<string, NotificationType> = {
			// [NotificationKey.ConfirmEmail]: {
			// 	level: NotificationLevel.Normal,
			// 	message: `Welcome to ${this.appName}! An email has been sent to you containing an activation link to complete your registration. Make sure you click it to secure your account and keep access to it.`,
			// },
			[NotificationKey.EmailConfirmed]: {
				level: NotificationLevel.Normal,
				message: 'Your email has been confirmed',
			},
			[NotificationKey.PasswordSet]: {
				level: NotificationLevel.Normal,
				message: `Welcome to ${this.appName}! Your password has been set successfully.`,
			},
			// [NotificationKey.UsingSqliteInProd]: {
			// 	level: NotificationLevel.Important,
			// 	message: 'The server is currently using SQLite3 as a database. It is not recommended in production as it is slow and can cause locking issues. Please see the README for information on how to change it.',
			// },
			[NotificationKey.UpgradedToPro]: {
				level: NotificationLevel.Normal,
				message: 'Thank you! Your account has been successfully upgraded to Pro.',
			},
			[NotificationKey.Any]: {
				level: NotificationLevel.Normal,
				message: '',
			},
		};

		const n: Notification = await this.loadByKey(userId, key);

		if (n) {
			if (!n.read) return n;
			await this.save({ id: n.id, read: 0 });
			return { ...n, read: 0 };
		}

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

		const actualKey = key === NotificationKey.Any ? `any_${uuidgen()}` : key;

		return this.save({ key: actualKey, message, level, owner_id: userId });
	}

	public async addInfo(userId: Uuid, message: string) {
		return this.add(userId, NotificationKey.Any, NotificationLevel.Normal, message);
	}

	public async addError(userId: Uuid, error: string | Error) {
		const message = typeof error === 'string' ? error : error.message;
		return this.add(userId, NotificationKey.Any, NotificationLevel.Error, message);
	}

	public async setRead(userId: Uuid, key: NotificationKey, read = true): Promise<void> {
		const n = await this.loadByKey(userId, key);
		if (!n) return;

		await this.db(this.tableName)
			.update({ read: read ? 1 : 0 })
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

	public loadUnreadByKey(userId: Uuid, key: NotificationKey): Promise<Notification> {
		return this.db(this.tableName)
			.select(this.defaultFields)
			.where('key', '=', key)
			.andWhere('read', '=', 0)
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
