import Logger from '@joplin/utils/Logger';

export default class AlarmServiceDriver {
	public constructor(logger: Logger) {
		logger.warn('WARNING: AlarmServiceDriver is not implemented on web');
	}

	public hasPersistentNotifications() {
		return false;
	}

	public notificationIsSet() {
		throw new Error('Available only for non-persistent alarms');
	}

	public setInAppNotificationHandler(_v: any) {
	}

	public async hasPermissions(_perm: any = null) {
		return false;
	}

	public async requestPermissions() {
		return false;
	}

	public async clearNotification(_id: number) {
	}

	public async scheduleNotification(_notification: Notification) {
		
	}
}
