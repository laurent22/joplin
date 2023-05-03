import { Notification } from '@joplin/lib/models/Alarm';
import Logger from '@joplin/lib/Logger';
const PushNotificationIOS = require('@react-native-community/push-notification-ios').default;

export default class AlarmServiceDriver {

	private hasPermission_: boolean = null;
	private inAppNotificationHandler_: any = null;
	private logger_: Logger;

	public constructor(logger: Logger) {
		this.logger_ = logger;
		PushNotificationIOS.addEventListener('localNotification', (instance: any) => {
			if (!this.inAppNotificationHandler_) return;

			if (!instance || !instance._data || !instance._data.id) {
				this.logger_.warn('PushNotificationIOS.addEventListener: Did not receive a proper notification instance');
				return;
			}

			const id = instance._data.id;
			this.inAppNotificationHandler_(id);
		});
	}

	public hasPersistentNotifications() {
		return true;
	}

	public notificationIsSet() {
		throw new Error('Available only for non-persistent alarms');
	}

	public setInAppNotificationHandler(v: any) {
		this.inAppNotificationHandler_ = v;
	}

	public async hasPermissions(perm: any = null) {
		if (perm !== null) return perm.alert && perm.badge && perm.sound;

		if (this.hasPermission_ !== null) return this.hasPermission_;

		return new Promise((resolve) => {
			PushNotificationIOS.checkPermissions(async (perm: any) => {
				const ok = await this.hasPermissions(perm);
				this.hasPermission_ = ok;
				resolve(ok);
			});
		});
	}

	public async requestPermissions() {
		const options: any = {
			alert: 1,
			badge: 1,
			sound: 1,
		};
		const newPerm = await PushNotificationIOS.requestPermissions(options);
		this.hasPermission_ = null;
		return this.hasPermissions(newPerm);
	}

	public async clearNotification(id: number) {
		PushNotificationIOS.cancelLocalNotifications({ id: `${id}` });
	}

	public async scheduleNotification(notification: Notification) {
		if (!(await this.hasPermissions())) {
			const ok = await this.requestPermissions();
			if (!ok) return;
		}

		// ID must be a string and userInfo must be supplied otherwise cancel won't work
		const iosNotification: any = {
			id: `${notification.id}`,
			alertTitle: notification.title,
			fireDate: notification.date.toISOString(),
			userInfo: { id: `${notification.id}` },
		};

		if ('body' in notification) iosNotification.alertBody = notification.body;

		PushNotificationIOS.scheduleLocalNotification(iosNotification);
	}
}
