class AlarmServiceDriverNode {

	constructor() {
		this.notifications_ = {};
	}

	hasPersistentNotifications() {
		return false;
	}

	notificationIsSet(id) {
		return id in this.notifications_;
	}

	async clearNotification(id) {
		if (!this.notificationIsSet(id)) return;
		clearTimeout(this.notifications_[id].timeoutId);
		delete this.notifications_[id];
	}
	
	async scheduleNotification(notification) {
		const now = Date.now();
		const interval = notification.date.getTime() - now;
		if (interval < 0) return;

		const timeoutId = setTimeout(() => {
			console.info('NOTIFICATION: ', notification);
			this.clearNotification(notification.id);
		}, interval);
	}

}

module.exports = AlarmServiceDriverNode;