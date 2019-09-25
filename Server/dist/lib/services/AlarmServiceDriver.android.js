const PushNotification = require('react-native-push-notification');

class AlarmServiceDriver {
	PushNotificationHandler_() {
		if (!this.PushNotification_) {
			PushNotification.configure({
				// (required) Called when a remote or local notification is opened or received
				onNotification: function(notification) {
					console.info('Notification was opened: ', notification);
					// process the notification
				},
				popInitialNotification: true,
				requestPermissions: true,
			});

			this.PushNotification_ = PushNotification;
		}

		return this.PushNotification_;
	}

	hasPersistentNotifications() {
		return true;
	}

	notificationIsSet() {
		throw new Error('Available only for non-persistent alarms');
	}

	async clearNotification(id) {
		return this.PushNotificationHandler_().cancelLocalNotifications({ id: `${id}` });
	}

	async scheduleNotification(notification) {
		const config = {
			id: `${notification.id}`,
			message: notification.title,
			date: notification.date,
		};

		this.PushNotificationHandler_().localNotificationSchedule(config);
	}
}

module.exports = AlarmServiceDriver;
