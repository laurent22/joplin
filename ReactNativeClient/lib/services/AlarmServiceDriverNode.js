const notifier = require('node-notifier');

class AlarmServiceDriverNode {
	constructor(options) {
		// Note: appName is required to get the notification to work. It must be the same as the appId defined in package.json
		// https://github.com/mikaelbr/node-notifier/issues/144#issuecomment-319324058
		this.appName_ = options.appName;
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

		if (isNaN(interval)) {
			throw new Error('Trying to create a notification from an invalid object: ' + JSON.stringify(notification));
		}

		const timeoutId = setTimeout(() => {
			const o = {
				appName: this.appName_,
				title: notification.title,
			};
			if ('body' in notification) o.message = notification.body;
			notifier.notify(o);
			this.clearNotification(notification.id);
		}, interval);

		this.notifications_[notification.id] = Object.assign({}, notification);
		this.notifications_[notification.id].timeoutId = timeoutId;
	}
}

module.exports = AlarmServiceDriverNode;
