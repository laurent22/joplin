export declare enum LockType {
    None = "",
    Sync = "sync",
    Exclusive = "exclusive"
}
export interface Lock {
    type: LockType;
    clientType: string;
    clientId: string;
    updatedTime?: number;
}
export interface LockHandlerOptions {
    autoRefreshInterval?: number;
    lockTtl?: number;
}
export default class LockHandler {
    private api_;
    private refreshTimers_;
    private autoRefreshInterval_;
    private lockTtl_;
    constructor(api: any, options?: LockHandlerOptions);
    get lockTtl(): number;
    set lockTtl(v: number);
    private lockFilename;
    private lockTypeFromFilename;
    private lockFilePath;
    private lockFileToObject;
    locks(lockType?: LockType): Promise<Lock[]>;
    private lockIsActive;
    hasActiveLock(lockType: LockType, clientType?: string, clientId?: string): Promise<boolean>;
    activeLock(lockType: LockType, clientType?: string, clientId?: string): Promise<Lock>;
    private saveLock;
    saveLock_(lock: Lock): Promise<void>;
    private acquireSyncLock;
    private lockToClientString;
    private acquireExclusiveLock;
    private autoLockRefreshHandle;
    startAutoLockRefresh(lock: Lock, errorHandler: Function): string;
    stopAutoLockRefresh(lock: Lock): void;
    acquireLock(lockType: LockType, clientType: string, clientId: string, timeoutMs?: number): Promise<Lock>;
    releaseLock(lockType: LockType, clientType: string, clientId: string): Promise<void>;
}
