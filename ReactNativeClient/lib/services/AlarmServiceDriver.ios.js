const { PushNotificationIOS } = require('react-native');

class AlarmServiceDriver {

	constructor() {
		this.hasPermission_ = null;
	}

	hasPersistentNotifications() {
		return true;
	}

	notificationIsSet(alarmId) {
		throw new Error('Available only for non-persistent alarms');	
	}

	async hasPermissions(perm = null) {
		if (perm !== null) return perm.alert && perm.badge && perm.sound;

		if (this.hasPermission_ !== null) return this.hasPermission_;

		return new Promise((resolve, reject) => {
			PushNotificationIOS.checkPermissions(async (perm) => {
				const ok = await this.hasPermissions(perm);
				this.hasPermission_ = ok;
				resolve(ok);
			});
		});
	}

	async requestPermissions() {
		const newPerm = await PushNotificationIOS.requestPermissions({
			alert:1,
			badge:1,
			sound:1,
		});
		this.hasPermission_ = null;
		return this.hasPermissions(newPerm);
	}

	async clearNotification(id) {
		PushNotificationIOS.cancelLocalNotifications({ id: id + '' });
	}
	
	async scheduleNotification(notification) {
		if (!(await this.hasPermissions())) {
			const ok = await this.requestPermissions();
			if (!ok) return;
		}

		// ID must be a string and userInfo must be supplied otherwise cancel won't work
		const iosNotification = {
			id: notification.id + '',
			alertTitle: notification.title,
			fireDate: notification.date,
			userInfo: { id: notification.id + '' },
		};

		if ('body' in notification) iosNotification.alertBody = notification.body;

		PushNotificationIOS.scheduleLocalNotification(iosNotification);
	}

}

module.exports = AlarmServiceDriver;