import { Notification } from 'lib/models/Alarm';
export default class AlarmServiceDriver {
    private hasPermission_;
    private inAppNotificationHandler_;
    constructor();
    hasPersistentNotifications(): boolean;
    notificationIsSet(): void;
    setInAppNotificationHandler(v: any): void;
    hasPermissions(perm?: any): Promise<any>;
    requestPermissions(): Promise<any>;
    clearNotification(id: any): Promise<void>;
    scheduleNotification(notification: Notification): Promise<void>;
}
