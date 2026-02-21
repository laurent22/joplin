import Logger from '@joplin/utils/Logger';
import { Notification } from '@joplin/lib/models/Alarm';

const ReactNativeAN = require('@joplin/react-native-alarm-notification').default;

interface AlarmServiceInterface {
	handleNotificationTrigger(id: number): Promise<void>;
}

export default class AlarmServiceDriver {

	private logger_: Logger;

	public constructor(logger: Logger) {
		this.logger_ = logger;
	}

	// Android handles notification triggers via AlarmService.updateAllNotifications() on app startup.
	// No direct service reference is needed in this driver, but setService is kept for API consistency.
	public setService(_v: AlarmServiceInterface) {
		// Not used on Android
	}

	public hasPersistentNotifications() {
		return true;
	}

	public notificationIsSet() {
		throw new Error('Available only for non-persistent alarms');
	}

	public async clearNotification(id: number) {
		const alarm = await this.alarmByJoplinNotificationId(id);
		if (!alarm) return;

		this.logger_.info('AlarmServiceDriver: Deleting alarm:', alarm);

		await ReactNativeAN.deleteAlarm(alarm.id);
	}

	// Returns -1 if could not be found
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private alarmJoplinAlarmId(alarm: any): number {
		if (!alarm.data || !alarm.data.joplinNotificationId) {
			return -1;
		} else {
			return alarm.data.joplinNotificationId;
		}
	}

	private async alarmByJoplinNotificationId(joplinNotificationId: number) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const alarms: any[] = await ReactNativeAN.getScheduledAlarms();
		for (const alarm of alarms) {
			const id = this.alarmJoplinAlarmId(alarm);
			if (id === joplinNotificationId) return alarm;
		}

		this.logger_.warn('AlarmServiceDriver: Could not find alarm that matches Joplin notification ID. It could be because it has already been triggered:', joplinNotificationId);
		return null;
	}

	public async scheduleNotification(notification: Notification) {
		// Note: Android alarms are OS-level persistent notifications.
		// Rescheduling of repeating alarms is handled via service_.handleNotificationTrigger()
		// which is called on app startup through AlarmService.updateAllNotifications().
		const alarmNotifData = {
			title: notification.title,
			message: notification.body ? notification.body : '-', // Required
			channel: 'net.cozic.joplin.notification',
			small_icon: 'ic_launcher_foreground', // Android requires the icon to be transparent
			color: 'blue',
			data: {
				joplinNotificationId: notification.id,
				noteId: notification.noteId,
			},
		};

		// ReactNativeAN expects a string as a date and it seems this utility
		// function converts it to the right format.
		const fireDate = ReactNativeAN.parseDate(notification.date);

		const alarm = await ReactNativeAN.scheduleAlarm({ ...alarmNotifData, fire_date: fireDate });

		this.logger_.info('AlarmServiceDriver: Created new alarm:', alarm);
	}
}
