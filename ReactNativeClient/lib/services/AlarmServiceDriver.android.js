import firebase from 'react-native-firebase';

class AlarmServiceDriver {

	hasPersistentNotifications() {
		return true;
	}

	notificationIsSet(alarmId) {
		throw new Error('Available only for non-persistent alarms');	
	}

	firebaseNotificationId_(joplinNotificationId) {
		return 'net.cozic.joplin-' + joplinNotificationId;
	}

	async clearNotification(id) {
		return firebase.notifications().cancelNotification(this.firebaseNotificationId_(id))
	}
	
	async scheduleNotification(notification) {
		const firebaseNotification = new firebase.notifications.Notification()
		firebaseNotification.setNotificationId(this.firebaseNotificationId_(notification.id));
		firebaseNotification.setTitle(notification.title)	
		if ('body' in notification) firebaseNotification.body = notification.body;
		firebaseNotification.android.setChannelId('com.google.firebase.messaging.default_notification_channel_id');
		firebaseNotification.android.setSmallIcon('ic_stat_access_alarm');

		firebase.notifications().scheduleNotification(firebaseNotification, {
			fireDate: notification.date.getTime(),
		});
	}

}

module.exports = AlarmServiceDriver;