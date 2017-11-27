const PushNotification = require('react-native-push-notification');

class AlarmServiceDriver {

	async clearNotification(id) {
		PushNotification.cancelLocalNotifications({ id: id });
	}
	
	async scheduleNotification(notification) {
		const androidNotification = {
			id: notification.id,
			message: notification.title.substr(0, 100), // No idea what the limits are for title and body but set something reasonable anyway
			date: notification.date,
		};

		if ('body' in notification) androidNotification.body = notification.body.substr(0, 512);

		PushNotification.localNotificationSchedule(androidNotification);
	}

}

module.exports = AlarmServiceDriver;