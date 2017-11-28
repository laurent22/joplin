const PushNotification = require('react-native-push-notification');

class AlarmServiceDriver {

	hasPersistentNotifications() {
		return true;
	}

	notificationIsSet(alarmId) {
		throw new Error('Available only for non-persistent alarms');	
	}

	async clearNotification(id) {
		PushNotification.cancelLocalNotifications({ id: id + '' });
	}
	
	async scheduleNotification(notification) {
		// Arguments must be set in a certain way and certain format otherwise it cannot be
		// cancelled later on. See:
		// https://github.com/zo0r/react-native-push-notification/issues/570#issuecomment-337642922
		const androidNotification = {
			id: notification.id + '',
			message: notification.title,
			date: notification.date,
			userInfo: { id: notification.id + '' },
			number: 0,
		};

		if ('body' in notification) androidNotification.body = notification.body;

		PushNotification.localNotificationSchedule(androidNotification);
	}

}

module.exports = AlarmServiceDriver;