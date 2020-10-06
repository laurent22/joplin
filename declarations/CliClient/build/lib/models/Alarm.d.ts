declare const BaseModel: any;
export interface Notification {
    id: string;
    noteId: string;
    date: Date;
    title: string;
    body?: string;
}
export default class Alarm extends BaseModel {
    static tableName(): string;
    static modelType(): any;
    static byNoteId(noteId: string): any;
    static deleteExpiredAlarms(): Promise<any>;
    static alarmIdsWithoutNotes(): Promise<any>;
    static makeNotification(alarm: any, note?: any): Promise<Notification>;
    static allDue(): Promise<any>;
}
export {};
