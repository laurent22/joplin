export interface QueueItemAction {
    (): void;
}
export interface QueueItem {
    action: QueueItemAction;
    context: any;
}
export declare enum IntervalType {
    Debounce = 1,
    Fixed = 2
}
export default class AsyncActionQueue {
    queue_: QueueItem[];
    interval_: number;
    intervalType_: number;
    scheduleProcessingIID_: any;
    processing_: boolean;
    needProcessing_: boolean;
    constructor(interval?: number, intervalType?: IntervalType);
    push(action: QueueItemAction, context?: any): void;
    get queue(): QueueItem[];
    private scheduleProcessing;
    private processQueue;
    reset(): Promise<unknown>;
    processAllNow(): Promise<unknown>;
    waitForAllDone(): Promise<unknown>;
}
