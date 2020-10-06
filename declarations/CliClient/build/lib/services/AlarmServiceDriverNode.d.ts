import { Notification } from 'lib/models/Alarm';
interface Options {
    appName: string;
}
export default class AlarmServiceDriverNode {
    private appName_;
    private notifications_;
    private service_;
    constructor(options: Options);
    setService(s: any): void;
    logger(): any;
    hasPersistentNotifications(): boolean;
    notificationIsSet(id: string): boolean;
    clearNotification(id: string): Promise<void>;
    scheduleNotification(notification: Notification): Promise<void>;
}
export {};
