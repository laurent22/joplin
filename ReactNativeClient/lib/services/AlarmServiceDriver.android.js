// Note: currently, if Play Services aren't available, notifications will not work at all
// There won't be any warning or error message.

import firebase from 'react-native-firebase';

class AlarmServiceDriver {

	constructor() {
		this.playServiceAvailable_ = firebase.utils().playServicesAvailability.isAvailable;
		if (!this.playServiceAvailable_) return;

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
		if (!this.playServiceAvailable_) return;

		return firebase.notifications().cancelNotification(this.firebaseNotificationId_(id))
	}
	
	async scheduleNotification(notification) {
		if (!this.playServiceAvailable_) return;

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