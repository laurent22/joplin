import PushNotificationIOS from '@react-native-community/push-notification-ios';

class AlarmServiceDriver {
	constructor() {
		this.hasPermission_ = null;
		this.inAppNotificationHandler_ = null;

		PushNotificationIOS.addEventListener('localNotification', instance => {
			if (!this.inAppNotificationHandler_) return;

			if (!instance || !instance._data || !instance._data.id) {
				console.warn('PushNotificationIOS.addEventListener: Did not receive a proper notification instance');
				return;
			}

			const id = instance._data.id;
			this.inAppNotificationHandler_(id);
		});
	}

	hasPersistentNotifications() {
		return true;
	}

	notificationIsSet() {
		throw new Error('Available only for non-persistent alarms');
	}

	setInAppNotificationHandler(v) {
		this.inAppNotificationHandler_ = v;
	}

	async hasPermissions(perm = null) {
		if (perm !== null) return perm.alert && perm.badge && perm.sound;

		if (this.hasPermission_ !== null) return this.hasPermission_;

		return new Promise((resolve) => {
			PushNotificationIOS.checkPermissions(async perm => {
				const ok = await this.hasPermissions(perm);
				this.hasPermission_ = ok;
				resolve(ok);
			});
		});
	}

	async requestPermissions() {
		const newPerm = await PushNotificationIOS.requestPermissions({
			alert: 1,
			badge: 1,
			sound: 1,
		});
		this.hasPermission_ = null;
		return this.hasPermissions(newPerm);
	}

	async clearNotification(id) {
		PushNotificationIOS.cancelLocalNotifications({ id: `${id}` });
	}

	async scheduleNotification(notification) {
		if (!(await this.hasPermissions())) {
			const ok = await this.requestPermissions();
			if (!ok) return;
		}

		// ID must be a string and userInfo must be supplied otherwise cancel won't work
		const iosNotification = {
			id: `${notification.id}`,
			alertTitle: notification.title,
			fireDate: notification.date.toISOString(),
			userInfo: { id: `${notification.id}` },
		};

		if ('body' in notification) iosNotification.alertBody = notification.body;

		PushNotificationIOS.scheduleLocalNotification(iosNotification);
	}
}

module.exports = AlarmServiceDriver;
