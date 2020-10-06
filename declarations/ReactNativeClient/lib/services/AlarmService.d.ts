import Logger from 'lib/Logger';
export default class AlarmService {
    private static driver_;
    private static logger_;
    static setDriver(v: any): void;
    static driver(): any;
    static setLogger(v: Logger): void;
    static logger(): Logger;
    static setInAppNotificationHandler(v: any): void;
    static garbageCollect(): Promise<void>;
    static updateNoteNotification(noteOrId: any, isDeleted?: boolean): Promise<void>;
    static updateAllNotifications(): Promise<void>;
}
