import LockHandler from './LockHandler';
declare const BaseService: any;
interface SyncTargetInfo {
    version: number;
}
export default class MigrationHandler extends BaseService {
    private api_;
    private lockHandler_;
    private clientType_;
    private clientId_;
    constructor(api: any, lockHandler: LockHandler, clientType: string, clientId: string);
    fetchSyncTargetInfo(): Promise<SyncTargetInfo>;
    private serializeSyncTargetInfo;
    checkCanSync(): Promise<SyncTargetInfo>;
    upgrade(targetVersion?: number): Promise<void>;
}
export {};
