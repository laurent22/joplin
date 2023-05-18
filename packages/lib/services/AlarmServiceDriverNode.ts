import eventManager from '../eventManager';
import { Notification } from '../models/Alarm';
import shim from '../shim';
import Setting from '../models/Setting';
const notifier = require('node-notifier');

interface Options {
	appName: string;
}

export default class AlarmServiceDriverNode {

	private appName_: string;
	private notifications_: any = {};
	private service_: any = null;

	public constructor(options: Options) {
		// Note: appName is required to get the notification to work. It must be the same as the appId defined in package.json
		// https://github.com/mikaelbr/node-notifier/issues/144#issuecomment-319324058
		this.appName_ = options.appName;
	}

	public setService(s: any) {
		this.service_ = s;
	}

	public logger() {
		return this.service_.logger();
	}

	public hasPersistentNotifications() {
		return false;
	}

	public notificationIsSet(id: number) {
		return id in this.notifications_;
	}

	public clearNotification(id: number) {
		if (!this.notificationIsSet(id)) return;
		shim.clearTimeout(this.notifications_[id].timeoutId);
		delete this.notifications_[id];
	}

	private displayDefaultNotification(notification: Notification) {
		const o: any = {
			appID: this.appName_,
			title: notification.title,
			icon: `${shim.electronBridge().electronApp().buildDir()}/icons/512x512.png`,
		};
		if ('body' in notification) o.message = notification.body;

		// Message is required on Windows 7 however we don't want to repeat the title so
		// make it an empty string.
		// https://github.com/laurent22/joplin/issues/2144
		if (!o.message) o.message = '-';

		this.logger().info('AlarmServiceDriverNode::scheduleNotification: Triggering notification (default):', o);

		notifier.notify(o, (error: any, response: any) => {
			this.logger().info('AlarmServiceDriverNode::scheduleNotification: node-notifier response:', error, response);
		});
	}

	private displayMacNotification(notification: Notification) {
		// On macOS, node-notifier is broken:
		//
		// https://github.com/mikaelbr/node-notifier/issues/352
		//
		// However we can use the native browser notification as described
		// there:
		//
		// https://www.electronjs.org/docs/tutorial/notifications
		//
		// In fact it's likely that we could use this on other platforms too
		try {
			const options: any = {
				body: notification.body ? notification.body : '-',
				onerror: (error: any) => {
					this.logger().error('AlarmServiceDriverNode::displayMacNotification', error);
				},
			};

			this.logger().info('AlarmServiceDriverNode::displayMacNotification: Triggering notification (macOS):', notification.title, options);

			new Notification(notification.title, options);
		} catch (error) {
			this.logger().error('AlarmServiceDriverNode::displayMacNotification', error);
		}
	}

	private async checkPermission() {
		if (shim.isMac() && shim.isElectron()) {
			this.logger().info(`AlarmServiceDriverNode::checkPermission: Permission in settings is "${Setting.value('notificationPermission')}"`);

			if (Setting.value('notificationPermission') !== '') return Setting.value('notificationPermission');

			// In theory `Notification.requestPermission()` should be used to
			// ask for permission but in practice this API is unreliable. In
			// particular, it returns "granted" immediately even when
			// notifications definitely aren't allowed (and creating a new
			// notification would fail).
			//
			// Because of that, our approach is to trigger a notification, which
			// should prompt macOS to ask for permission. Once this is done we
			// manually save the result in the settings. Of course it means that
			// if permission is changed afterwards, for example from the
			// notification center, we won't know it and notifications will
			// fail.
			//
			// All this means that for now this checkPermission function always
			// returns "granted" and the setting has only two values: "granted"
			// or "" (which means we need to do the check permission trick).
			//
			// The lack of "denied" value is acceptable in our context because
			// if a user doesn't want notifications, they can simply not set
			// alarms.

			new Notification('Checking permissions...', {
				body: 'Permission has been granted',
			});

			Setting.setValue('notificationPermission', 'granted');
		}

		return 'granted';
	}

	public async scheduleNotification(notification: Notification) {
		const now = Date.now();
		const interval = notification.date.getTime() - now;
		if (interval < 0) return;

		if (isNaN(interval)) {
			throw new Error(`Trying to create a notification from an invalid object: ${JSON.stringify(notification)}`);
		}

		const permission = await this.checkPermission();
		if (permission !== 'granted') {
			this.logger().info(`AlarmServiceDriverNode::scheduleNotification: Notification ${notification.id}: Cancelled because permission was not granted.`);
			return;
		}

		this.logger().info(`AlarmServiceDriverNode::scheduleNotification: Notification ${notification.id} with interval: ${interval}ms`);

		if (this.notifications_[notification.id]) shim.clearTimeout(this.notifications_[notification.id].timeoutId);

		let timeoutId = null;

		// Note: setTimeout will break for values larger than Number.MAX_VALUE - in which case the timer
		// will fire immediately. So instead, if the interval is greater than a set max, reschedule after
		// that max interval.
		// https://stackoverflow.com/questions/3468607/why-does-settimeout-break-for-large-millisecond-delay-values/3468699

		const maxInterval = 60 * 60 * 1000;
		if (interval >= maxInterval) {
			this.logger().info(`AlarmServiceDriverNode::scheduleNotification: Notification interval is greater than ${maxInterval}ms - will reschedule in ${maxInterval}ms`);

			timeoutId = shim.setTimeout(() => {
				if (!this.notifications_[notification.id]) {
					this.logger().info(`AlarmServiceDriverNode::scheduleNotification: Notification ${notification.id} has been deleted - not rescheduling it`);
					return;
				}
				void this.scheduleNotification(this.notifications_[notification.id]);
			}, maxInterval);
		} else {
			timeoutId = shim.setTimeout(() => {
				if (shim.isMac() && shim.isElectron()) {
					this.displayMacNotification(notification);
				} else {
					this.displayDefaultNotification(notification);
				}

				this.clearNotification(notification.id);

				eventManager.emit('noteAlarmTrigger', { noteId: notification.noteId });
			}, interval);
		}

		this.notifications_[notification.id] = Object.assign({}, notification);
		this.notifications_[notification.id].timeoutId = timeoutId;
	}
}
