import { Notification } from 'lib/models/Alarm';
export default class AlarmServiceDriver {
    private PushNotification_;
    PushNotificationHandler_(): any;
    hasPersistentNotifications(): boolean;
    notificationIsSet(): void;
    clearNotification(id: any): Promise<any>;
    scheduleNotification(notification: Notification): Promise<void>;
}
