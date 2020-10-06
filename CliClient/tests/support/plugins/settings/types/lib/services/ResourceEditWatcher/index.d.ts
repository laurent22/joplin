export default class ResourceEditWatcher {
    private static instance_;
    private logger_;
    private dispatch;
    private watcher_;
    private chokidar_;
    private watchedItems_;
    private eventEmitter_;
    private tempDir_;
    constructor();
    initialize(logger: any, dispatch: Function): void;
    static instance(): ResourceEditWatcher;
    private tempDir;
    logger(): any;
    on(eventName: string, callback: Function): any;
    off(eventName: string, callback: Function): any;
    private watch;
    openAndWatch(resourceId: string): Promise<void>;
    stopWatching(resourceId: string): Promise<void>;
    stopWatchingAll(): Promise<void>;
    private watchedItemByResourceId;
    private watchedItemByPath;
}
