import firebase from 'react-native-firebase';

class AlarmServiceDriver {

	constructor() {
		this.channel_ = new firebase.notifications.Android.Channel('net.cozic.joplin.notification', 'Joplin Alarm',firebase.notifications.Android.Importance.Max)
			.setDescription('Displays a notification for alarms associated with to-dos.');
		firebase.notifications().android.createChannel(this.channel_);
	}

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
		firebaseNotification.android.setChannelId('net.cozic.joplin.notification');
		firebaseNotification.android.setSmallIcon('ic_stat_access_alarm');

		await firebase.notifications().scheduleNotification(firebaseNotification, {
			fireDate: notification.date.getTime(),
		});
	}

}

module.exports = AlarmServiceDriver;