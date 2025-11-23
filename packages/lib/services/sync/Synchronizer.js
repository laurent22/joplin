"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const LockHandler_1 = require("./services/synchronizer/LockHandler");
const Setting_1 = require("./models/Setting");
const shim_1 = require("./shim");
const MigrationHandler_1 = require("./services/synchronizer/MigrationHandler");
const eventManager_1 = require("./eventManager");
const locale_1 = require("./locale");
const BaseItem_1 = require("./models/BaseItem");
const Folder_1 = require("./models/Folder");
const Note_1 = require("./models/Note");
const Resource_1 = require("./models/Resource");
const ItemChange_1 = require("./models/ItemChange");
const ResourceLocalState_1 = require("./models/ResourceLocalState");
const MasterKey_1 = require("./models/MasterKey");
const BaseModel_1 = require("./BaseModel");
const time_1 = require("./time");
const JoplinError_1 = require("./JoplinError");
const TaskQueue_1 = require("./TaskQueue");
const ItemUploader_1 = require("./services/synchronizer/ItemUploader");
const file_api_1 = require("./file-api");
const syncInfoUtils_1 = require("./services/synchronizer/syncInfoUtils");
const utils_1 = require("./services/e2ee/utils");
const ppk_1 = require("./services/e2ee/ppk/ppk");
const syncDebugLog_1 = require("./services/synchronizer/syncDebugLog");
const handleConflictAction_1 = require("./services/synchronizer/utils/handleConflictAction");
const resourceRemotePath_1 = require("./services/synchronizer/utils/resourceRemotePath");
const syncDeleteStep_1 = require("./services/synchronizer/utils/syncDeleteStep");
const errors_1 = require("./errors");
const types_1 = require("./services/synchronizer/utils/types");
const checkDisabledSyncItemsNotification_1 = require("./services/synchronizer/utils/checkDisabledSyncItemsNotification");
const registry_1 = require("./registry");
const SyncTargetRegistry_1 = require("./SyncTargetRegistry");
const { sprintf } = require('sprintf-js');
const { Dirnames } = require('./services/synchronizer/utils/types');
const logger = Logger_1.default.create('Synchronizer');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function isCannotSyncError(error) {
    if (!error)
        return false;
    if (['rejectedByTarget', 'fileNotFound'].indexOf(error.code) >= 0)
        return true;
    // If the request times out we give up too because sometimes it's due to the
    // file being large or some other connection issues, and we don't want that
    // file to block the sync process. The user can choose to retry later on.
    //
    // message: "network timeout at: .....
    // name: "FetchError"
    // type: "request-timeout"
    if (error.type === 'request-timeout' || error.message.includes('network timeout'))
        return true;
    return false;
}
class Synchronizer {
    constructor(db, api, appType) {
        this.logger_ = new Logger_1.default();
        this.state_ = 'idle';
        this.cancelling_ = false;
        this.maxResourceSize_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.downloadQueue_ = null;
        this.encryptionService_ = null;
        this.resourceService_ = null;
        this.syncTargetIsLocked_ = false;
        this.shareService_ = null;
        this.lockClientType_ = null;
        // Debug flags are used to test certain hard-to-test conditions
        // such as cancelling in the middle of a loop.
        this.testingHooks_ = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.progressReport_ = {};
        this.db_ = db;
        this.api_ = api;
        this.appType_ = appType;
        this.clientId_ = Setting_1.default.value('clientId');
        this.onProgress_ = function () { };
        this.progressReport_ = {};
        this.dispatch = function () { };
        this.apiCall = this.apiCall.bind(this);
    }
    state() {
        return this.state_;
    }
    db() {
        return this.db_;
    }
    api() {
        return this.api_;
    }
    clientId() {
        return this.clientId_;
    }
    setLogger(l) {
        const previous = this.logger_;
        this.logger_ = l;
        return previous;
    }
    logger() {
        return this.logger_;
    }
    lockHandler() {
        if (this.lockHandler_)
            return this.lockHandler_;
        this.lockHandler_ = new LockHandler_1.default(this.api());
        return this.lockHandler_;
    }
    lockClientType() {
        if (this.lockClientType_)
            return this.lockClientType_;
        this.lockClientType_ = (0, LockHandler_1.appTypeToLockType)(this.appType_);
        return this.lockClientType_;
    }
    migrationHandler() {
        if (this.migrationHandler_)
            return this.migrationHandler_;
        this.migrationHandler_ = new MigrationHandler_1.default(this.api(), this.db(), this.lockHandler(), this.lockClientType(), this.clientId_);
        return this.migrationHandler_;
    }
    maxResourceSize() {
        if (this.maxResourceSize_ !== null)
            return this.maxResourceSize_;
        return this.appType_ === Setting_1.AppType.Mobile ? 100 * 1000 * 1000 : Infinity;
    }
    setShareService(v) {
        this.shareService_ = v;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    setEncryptionService(v) {
        this.encryptionService_ = v;
    }
    encryptionService() {
        return this.encryptionService_;
    }
    setResourceService(v) {
        this.resourceService_ = v;
    }
    resourceService() {
        return this.resourceService_;
    }
    async waitForSyncToFinish() {
        if (this.state() === 'idle')
            return;
        while (true) {
            await time_1.default.sleep(1);
            if (this.state() === 'idle')
                return;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static reportHasErrors(report) {
        return !!report && !!report.errors && !!report.errors.length;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static completionTime(report) {
        const duration = report.completedTime - report.startTime;
        if (duration > 1000)
            return `${Math.round(duration / 1000)}s`;
        return `${duration}ms`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static reportToLines(report) {
        const lines = [];
        if (report.createLocal)
            lines.push((0, locale_1._)('Created local items: %d.', report.createLocal));
        if (report.updateLocal)
            lines.push((0, locale_1._)('Updated local items: %d.', report.updateLocal));
        if (report.createRemote)
            lines.push((0, locale_1._)('Created remote items: %d.', report.createRemote));
        if (report.updateRemote)
            lines.push((0, locale_1._)('Updated remote items: %d.', report.updateRemote));
        if (report.deleteLocal)
            lines.push((0, locale_1._)('Deleted local items: %d.', report.deleteLocal));
        if (report.deleteRemote)
            lines.push((0, locale_1._)('Deleted remote items: %d.', report.deleteRemote));
        if (report.fetchingTotal && report.fetchingProcessed)
            lines.push((0, locale_1._)('Fetched items: %d/%d.', report.fetchingProcessed, report.fetchingTotal));
        if (report.cancelling && !report.completedTime)
            lines.push((0, locale_1._)('Cancelling...'));
        if (report.completedTime)
            lines.push((0, locale_1._)('Completed: %s (%s)', time_1.default.formatMsToLocal(report.completedTime), this.completionTime(report)));
        if (this.reportHasErrors(report))
            lines.push((0, locale_1._)('Last error: %s', report.errors[report.errors.length - 1].toString().substr(0, 500)));
        return lines;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    logSyncOperation(action, local = null, remote = null, message = null, actionCount = 1) {
        const line = ['Sync'];
        line.push(action);
        if (message)
            line.push(message);
        let type = local && local.type_ ? local.type_ : null;
        if (!type)
            type = remote && remote.type_ ? remote.type_ : null;
        if (type)
            line.push(BaseItem_1.default.modelTypeToClassName(type));
        if (local) {
            const s = [];
            s.push(local.id);
            line.push(`(Local ${s.join(', ')})`);
        }
        if (remote) {
            const s = [];
            s.push(remote.id ? remote.id : remote.path);
            line.push(`(Remote ${s.join(', ')})`);
        }
        if (Synchronizer.verboseMode) {
            logger.info(line.join(': '));
        }
        else {
            logger.debug(line.join(': '));
        }
        if (!['fetchingProcessed', 'fetchingTotal'].includes(action))
            syncDebugLog_1.default.info(line.join(': '));
        if (!this.progressReport_[action])
            this.progressReport_[action] = 0;
        this.progressReport_[action] += actionCount;
        this.progressReport_.state = this.state();
        this.onProgress_(this.progressReport_);
        // Make sure we only send a **copy** of the report since it
        // is mutated within this class. Should probably use a lib
        // for this but for now this simple fix will do.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const reportCopy = {};
        for (const n in this.progressReport_)
            reportCopy[n] = this.progressReport_[n];
        if (reportCopy.errors)
            reportCopy.errors = this.progressReport_.errors.slice();
        this.dispatch({ type: 'SYNC_REPORT_UPDATE', report: reportCopy });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async logSyncSummary(report) {
        logger.info('Operations completed: ');
        for (const n in report) {
            if (!report.hasOwnProperty(n))
                continue;
            if (n === 'errors')
                continue;
            if (n === 'starting')
                continue;
            if (n === 'finished')
                continue;
            if (n === 'state')
                continue;
            if (n === 'startTime')
                continue;
            if (n === 'completedTime')
                continue;
            logger.info(`${n}: ${report[n] ? report[n] : '-'}`);
        }
        const folderCount = await Folder_1.default.count();
        const noteCount = await Note_1.default.count();
        const resourceCount = await Resource_1.default.count();
        logger.info(`Total folders: ${folderCount}`);
        logger.info(`Total notes: ${noteCount}`);
        logger.info(`Total resources: ${resourceCount}`);
        if (Synchronizer.reportHasErrors(report)) {
            logger.warn('There was some errors:');
            for (let i = 0; i < report.errors.length; i++) {
                const e = report.errors[i];
                logger.warn(e);
            }
        }
    }
    async cancel() {
        if (this.cancelling_ || this.state() === 'idle')
            return null;
        // Stop queue but don't set it to null as it may be used to
        // retrieve the last few downloads.
        if (this.downloadQueue_)
            this.downloadQueue_.stop();
        this.logSyncOperation('cancelling', null, null, '');
        this.cancelling_ = true;
        return new Promise((resolve) => {
            const iid = shim_1.default.setInterval(() => {
                if (this.state() === 'idle') {
                    shim_1.default.clearInterval(iid);
                    resolve(null);
                }
            }, 100);
        });
    }
    cancelling() {
        return this.cancelling_;
    }
    logLastRequests() {
        const lastRequests = this.api().lastRequests();
        if (!lastRequests || !lastRequests.length)
            return;
        for (const r of lastRequests) {
            const timestamp = time_1.default.unixMsToLocalHms(r.timestamp);
            logger.info(`Req ${timestamp}: ${r.request}`);
            logger.info(`Res ${timestamp}: ${r.response}`);
        }
    }
    static stateToLabel(state) {
        if (state === 'idle')
            return (0, locale_1._)('Idle');
        if (state === 'in_progress')
            return (0, locale_1._)('In progress');
        return state;
    }
    isFullSync(steps) {
        return steps.includes('update_remote') && steps.includes('delete_remote') && steps.includes('delta');
    }
    async lockErrorStatus_() {
        const locks = await this.lockHandler().locks();
        const currentDate = await this.lockHandler().currentDate();
        const hasActiveExclusiveLock = await (0, LockHandler_1.hasActiveLock)(locks, currentDate, this.lockHandler().lockTtl, LockHandler_1.LockType.Exclusive);
        if (hasActiveExclusiveLock)
            return 'hasExclusiveLock';
        if (this.lockHandler().enabled) {
            const hasActiveSyncLock = await (0, LockHandler_1.hasActiveLock)(locks, currentDate, this.lockHandler().lockTtl, LockHandler_1.LockType.Sync, this.lockClientType(), this.clientId_);
            if (!hasActiveSyncLock)
                return 'syncLockGone';
        }
        return '';
    }
    async setPpkIfNotExist(localInfo, remoteInfo) {
        if (localInfo.ppk || remoteInfo.ppk)
            return localInfo;
        const password = (0, utils_1.getMasterPassword)(false);
        if (!password)
            return localInfo;
        try {
            localInfo.ppk = await (0, ppk_1.generateKeyPair)(this.encryptionService(), password);
        }
        catch (error) {
            // TODO: Remove after RSA encryption is supported on all platforms.
            logger.error('Failed to generate RSA key pair', error);
        }
        return localInfo;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async apiCall(fnName, ...args) {
        if (this.syncTargetIsLocked_)
            throw new JoplinError_1.default('Sync target is locked - aborting API call', 'lockError');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const output = await this.api()[fnName](...args);
            return output;
        }
        catch (error) {
            const lockStatus = await this.lockErrorStatus_();
            // When there's an error due to a lock, we re-wrap the error and change the error code so that error handling
            // does not do special processing on the original error. For example, if a resource could not be downloaded,
            // don't mark it as a "cannotSyncItem" since we don't know that.
            if (lockStatus) {
                throw new JoplinError_1.default(`Sync target lock error: ${lockStatus}. Original error was: ${error.message}`, 'lockError');
            }
            else {
                throw error;
            }
        }
    }
    // Synchronisation is done in three major steps:
    //
    // 1. UPLOAD: Send to the sync target the items that have changed since the last sync.
    // 2. DELETE_REMOTE: Delete on the sync target, the items that have been deleted locally.
    // 3. DELTA: Find on the sync target the items that have been modified or deleted and apply the changes locally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async start(options = null) {
        if (!options)
            options = {};
        if (this.state() !== 'idle') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const error = new Error(sprintf('Synchronisation is already in progress. State: %s', this.state()));
            error.code = 'alreadyStarted';
            throw error;
        }
        this.state_ = 'in_progress';
        this.onProgress_ = options.onProgress ? options.onProgress : function () { };
        this.progressReport_ = { errors: [] };
        const lastContext = options.context ? options.context : {};
        const syncSteps = options.syncSteps ? options.syncSteps : ['update_remote', 'delete_remote', 'delta'];
        // The default is to log errors, but when testing it's convenient to be able to catch and verify errors
        const throwOnError = options.throwOnError === true;
        const syncTargetId = this.api().syncTargetId();
        this.syncTargetIsLocked_ = false;
        this.cancelling_ = false;
        const synchronizationId = time_1.default.unixMs().toString();
        const outputContext = Object.assign({}, lastContext);
        this.progressReport_.startTime = time_1.default.unixMs();
        this.dispatch({ type: 'SYNC_STARTED' });
        eventManager_1.default.emit(eventManager_1.EventName.SyncStart);
        this.logSyncOperation('starting', null, null, `Starting synchronisation to target ${syncTargetId}... supportsAccurateTimestamp = ${this.api().supportsAccurateTimestamp}; supportsMultiPut = ${this.api().supportsMultiPut}} [${synchronizationId}]`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const handleCannotSyncItem = async (ItemClass, syncTargetId, item, cannotSyncReason, itemLocation = null) => {
            await ItemClass.saveSyncDisabled(syncTargetId, item, cannotSyncReason, itemLocation);
        };
        // We index resources before sync mostly to flag any potential orphan
        // resource before it is being synced. That way, it can potentially be
        // auto-deleted at a later time. Indexing resources is fast so it's fine
        // to call it every time here.
        //
        // https://github.com/laurent22/joplin/issues/932#issuecomment-933736405
        try {
            if (this.resourceService()) {
                logger.info('Indexing resources...');
                await this.resourceService().indexNoteResources();
            }
        }
        catch (error) {
            logger.error('Error indexing resources:', error);
        }
        // Before syncing, we run the share service maintenance, which is going
        // to fetch share invitations and clear share_ids for unshared items, if any.
        if (this.shareService_) {
            try {
                await this.shareService_.maintenance();
            }
            catch (error) {
                logger.error('Could not run share service maintenance:', error);
            }
        }
        let errorToThrow = null;
        let syncLock = null;
        let hasCaughtError = false;
        try {
            // Before synchronising make sure all share_id properties are set
            // correctly so as to share/unshare the right items.
            try {
                await Folder_1.default.updateAllShareIds(this.resourceService(), this.shareService_ ? this.shareService_.shares : []);
                if (this.shareService_)
                    await this.shareService_.checkShareConsistency();
            }
            catch (error) {
                if (error && error.code === errors_1.ErrorCode.IsReadOnly) {
                    // We ignore it because the functions above tried to modify a
                    // read-only item and failed. Normally it shouldn't happen since
                    // the UI should prevent, but if there's a bug in the UI or some
                    // other issue we don't want sync to fail because of this.
                    logger.error('Could not update share because an item is readonly:', error);
                }
                else {
                    throw error;
                }
            }
            const itemUploader = new ItemUploader_1.default(this.api(), this.apiCall);
            await this.api().initialize();
            this.api().setTempDirName(Dirnames.Temp);
            try {
                let remoteInfo = await (0, syncInfoUtils_1.fetchSyncInfo)(this.api());
                logger.info('Sync target remote info:', remoteInfo.filterSyncInfo());
                eventManager_1.default.emit(eventManager_1.EventName.SessionEstablished);
                let syncTargetIsNew = false;
                if (!remoteInfo.version) {
                    logger.info('Sync target is new - setting it up...');
                    await this.migrationHandler().upgrade(Setting_1.default.value('syncVersion'));
                    remoteInfo = await (0, syncInfoUtils_1.fetchSyncInfo)(this.api());
                    syncTargetIsNew = true;
                }
                logger.info('Sync target is already setup - checking it...');
                await this.migrationHandler().checkCanSync(remoteInfo);
                const appVersion = shim_1.default.appVersion();
                if (appVersion !== 'unknown')
                    (0, syncInfoUtils_1.checkIfCanSync)(remoteInfo, appVersion);
                let localInfo = await (0, syncInfoUtils_1.localSyncInfo)();
                logger.info('Sync target local info:', localInfo.filterSyncInfo());
                localInfo = await this.setPpkIfNotExist(localInfo, remoteInfo);
                if (syncTargetIsNew && localInfo.activeMasterKeyId) {
                    localInfo = (0, syncInfoUtils_1.setMasterKeyHasBeenUsed)(localInfo, localInfo.activeMasterKeyId);
                }
                // console.info('LOCAL', localInfo);
                // console.info('REMOTE', remoteInfo);
                if (!(0, syncInfoUtils_1.syncInfoEquals)(localInfo, remoteInfo)) {
                    let newInfo = (0, syncInfoUtils_1.mergeSyncInfos)(localInfo, remoteInfo);
                    if (newInfo.activeMasterKeyId)
                        newInfo = (0, syncInfoUtils_1.setMasterKeyHasBeenUsed)(newInfo, newInfo.activeMasterKeyId);
                    const previousE2EE = localInfo.e2ee;
                    logger.info('Sync target info differs between local and remote - merging infos: ', newInfo.toObject());
                    await this.lockHandler().acquireLock(LockHandler_1.LockType.Exclusive, this.lockClientType(), this.clientId_, { clearExistingSyncLocksFromTheSameClient: true });
                    await (0, syncInfoUtils_1.uploadSyncInfo)(this.api(), newInfo);
                    await (0, syncInfoUtils_1.saveLocalSyncInfo)(newInfo);
                    await this.lockHandler().releaseLock(LockHandler_1.LockType.Exclusive, this.lockClientType(), this.clientId_);
                    // console.info('NEW', newInfo);
                    if (newInfo.e2ee !== previousE2EE) {
                        if (newInfo.e2ee) {
                            const mk = (0, syncInfoUtils_1.getActiveMasterKey)(newInfo);
                            await (0, utils_1.setupAndEnableEncryption)(this.encryptionService(), mk);
                        }
                        else {
                            await (0, utils_1.setupAndDisableEncryption)(this.encryptionService());
                        }
                    }
                }
                else {
                    // Set it to remote anyway so that timestamps are the same
                    // Note: that's probably not needed anymore?
                    // await uploadSyncInfo(this.api(), remoteInfo);
                }
            }
            catch (error) {
                if (error.code === 403) {
                    this.dispatch({ type: 'MUST_AUTHENTICATE', value: true });
                }
                if (error.code === 'outdatedSyncTarget') {
                    Setting_1.default.setValue('sync.upgradeState', Setting_1.default.SYNC_UPGRADE_STATE_SHOULD_DO);
                }
                throw error;
            }
            syncLock = await this.lockHandler().acquireLock(LockHandler_1.LockType.Sync, this.lockClientType(), this.clientId_);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            this.lockHandler().startAutoLockRefresh(syncLock, (error) => {
                logger.warn('Could not refresh lock - cancelling sync. Error was:', error);
                this.syncTargetIsLocked_ = true;
                void this.cancel();
            });
            // ========================================================================
            // 2. DELETE_REMOTE
            // ------------------------------------------------------------------------
            // Delete the remote items that have been deleted locally.
            // ========================================================================
            if (syncSteps.indexOf('delete_remote') >= 0) {
                await (0, syncDeleteStep_1.default)(syncTargetId, this.cancelling(), (action, local, logSyncOperation, message, actionCount) => {
                    this.logSyncOperation(action, local, logSyncOperation, message, actionCount);
                }, (fnName, ...args) => {
                    return this.apiCall(fnName, ...args);
                }, action => { return this.dispatch(action); });
            } // DELETE_REMOTE STEP
            // ========================================================================
            // 1. UPLOAD
            // ------------------------------------------------------------------------
            // First, find all the items that have been changed since the
            // last sync and apply the changes to remote.
            // ========================================================================
            if (syncSteps.indexOf('update_remote') >= 0) {
                const donePaths = [];
                const completeItemProcessing = (path) => {
                    donePaths.push(path);
                };
                while (true) {
                    if (this.cancelling())
                        break;
                    const result = await BaseItem_1.default.itemsThatNeedSync(syncTargetId);
                    const locals = result.items;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                    await itemUploader.preUploadItems(result.items.filter((it) => result.neverSyncedItemIds.includes(it.id)));
                    for (let i = 0; i < locals.length; i++) {
                        if (this.cancelling())
                            break;
                        let local = locals[i];
                        const ItemClass = BaseItem_1.default.itemClass(local);
                        const path = BaseItem_1.default.systemPath(local);
                        // Safety check to avoid infinite loops.
                        // - In fact this error is possible if the item is marked for sync (via sync_time or force_sync) while synchronisation is in
                        //   progress. When force_sync is not true, this is because the user is typing while the sync is running, so we should continue
                        //   looping, as we don't want the sync to stop when there are still un-synced outgoing changes, otherwise this creates a race condition
                        //   on mobile, where additional changes made during upload are not synced and don't trigger another sync, whereas a change made immediately
                        //   after the sync has finished will trigger another sync. Once the user has stopped typing, it can then break out of the loop and continue
                        //   the rest of the process.
                        // - It can also happen if the item is directly modified in the sync target, and set with an update_time in the future. In that case,
                        //   the local sync_time will be updated to Date.now() but on the next loop it will see that the remote item still has a date ahead
                        //   and will see a conflict. There's currently no automatic fix for this - the remote item on the sync target must be fixed manually
                        //   (by setting an updated_time less than current time).
                        if (donePaths.indexOf(path) >= 0) {
                            const syncItem = await BaseItem_1.default.syncItem(syncTargetId, local.id, { fields: ['force_sync'] });
                            if (local.updated_time > time_1.default.unixMs()) {
                                throw new JoplinError_1.default(sprintf('Processing a path that has already been done: %s. Remote item has an updated_time in the future', path), 'processingPathTwice');
                            }
                            else if (syncItem.force_sync) {
                                throw new JoplinError_1.default(sprintf('Processing a path that has already been done: %s. Item was marked for sync using force_sync', path), 'processingPathTwice');
                            }
                            else {
                                throw new JoplinError_1.default(sprintf('Processing a path that has already been done: %s. The user is making changes while the sync is in progress', path), 'changedDuringSync');
                            }
                        }
                        const remote = result.neverSyncedItemIds.includes(local.id) ? null : await this.apiCall('stat', path);
                        let action = null;
                        let itemIsReadOnly = false;
                        let reason = '';
                        let remoteContent = null;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                        const getConflictType = (conflictedItem) => {
                            if (conflictedItem.type_ === BaseModel_1.default.TYPE_NOTE)
                                return types_1.SyncAction.NoteConflict;
                            if (conflictedItem.type_ === BaseModel_1.default.TYPE_RESOURCE)
                                return types_1.SyncAction.ResourceConflict;
                            return types_1.SyncAction.ItemConflict;
                        };
                        if (!remote) {
                            if (!local.sync_time) {
                                action = types_1.SyncAction.CreateRemote;
                                reason = 'remote does not exist, and local is new and has never been synced';
                            }
                            else {
                                // Note or item was modified after having been deleted remotely
                                // "itemConflict" is for all the items except the notes, which are dealt with in a special way
                                action = getConflictType(local);
                                reason = 'remote has been deleted, but local has changes';
                            }
                        }
                        else {
                            // Note: in order to know the real updated_time value, we need to load the content. In theory we could
                            // rely on the file timestamp (in remote.updated_time) but in practice it's not accurate enough and
                            // can lead to conflicts (for example when the file timestamp is slightly ahead of its real
                            // updated_time). updated_time is set and managed by clients so it's always accurate.
                            // Same situation below for updateLocal.
                            //
                            // This is a bit inefficient because if the resulting action is "updateRemote" we don't need the whole
                            // content, but for now that will do since being reliable is the priority.
                            //
                            // Note: assuming a particular sync target is guaranteed to have accurate timestamps, the driver maybe
                            // could expose this with a accurateTimestamps() method that returns "true". In that case, the test
                            // could be done using the file timestamp and the potentially unnecessary content loading could be skipped.
                            // OneDrive does not appear to have accurate timestamps as lastModifiedDateTime would occasionally be
                            // a few seconds ahead of what it was set with setTimestamp()
                            try {
                                remoteContent = await this.apiCall('get', path);
                            }
                            catch (error) {
                                if (error.code === 'rejectedByTarget') {
                                    this.progressReport_.errors.push(error);
                                    logger.warn(`Rejected by target: ${path}: ${error.message}`);
                                    completeItemProcessing(path);
                                    continue;
                                }
                                else {
                                    throw error;
                                }
                            }
                            if (!remoteContent)
                                throw new Error(`Got metadata for path but could not fetch content: ${path}`);
                            remoteContent = await BaseItem_1.default.unserialize(remoteContent);
                            if (remoteContent.updated_time > local.sync_time) {
                                // Since, in this loop, we are only dealing with items that require sync, if the
                                // remote has been modified after the sync time, it means both items have been
                                // modified and so there's a conflict.
                                action = getConflictType(local);
                                reason = 'both remote and local have changes';
                            }
                            else {
                                action = types_1.SyncAction.UpdateRemote;
                                reason = 'local has changes';
                            }
                        }
                        // We no longer upload Master Keys however we keep them
                        // in the database for extra safety. In a future
                        // version, once it's confirmed that the new E2EE system
                        // works well, we can delete them.
                        if (local.type_ === BaseModel_1.ModelType.MasterKey)
                            action = null;
                        this.logSyncOperation(action, local, remote, reason);
                        if (local.type_ === BaseModel_1.default.TYPE_RESOURCE && (action === types_1.SyncAction.CreateRemote || action === types_1.SyncAction.UpdateRemote)) {
                            const localState = await Resource_1.default.localState(local.id);
                            if (localState.fetch_status !== Resource_1.default.FETCH_STATUS_DONE) {
                                // This condition normally shouldn't happen
                                // because the normal cases are as follow:
                                //
                                // - User creates a resource locally - in that
                                //   case the fetch status is DONE, so we cannot
                                //   end up here.
                                //
                                // - User fetches a new resource metadata, but
                                //   not the blob - in that case fetch status is
                                //   IDLE. However in that case, we cannot end
                                //   up in this place either, because the action
                                //   cannot be createRemote (because the
                                //   resource has not been created locally) or
                                //   updateRemote (because a resource cannot be
                                //   modified locally unless the blob is present
                                //   too).
                                //
                                // Possibly the only case we can end up here is
                                // if a resource metadata has been downloaded,
                                // but not the blob yet. Then the sync target is
                                // switched to a different one. In that case, we
                                // can have a fetch status IDLE, with an
                                // "updateRemote" action, if the timestamp of
                                // the server resource is before the timestamp
                                // of the local resource.
                                //
                                // In that case we can't do much so we mark the
                                // resource as "cannot sync". Otherwise it will
                                // throw the error "Processing a path that has
                                // already been done" on the next loop, and sync
                                // will never finish because we'll always end up
                                // here.
                                logger.info(`Need to upload a resource, but blob is not present: ${path}`);
                                await handleCannotSyncItem(ItemClass, syncTargetId, local, 'Trying to upload resource, but only metadata is present.');
                                action = null;
                            }
                            else {
                                try {
                                    const remoteContentPath = (0, resourceRemotePath_1.default)(local.id);
                                    const result = await Resource_1.default.fullPathForSyncUpload(local);
                                    const resource = result.resource;
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                                    local = resource;
                                    const localResourceContentPath = result.path;
                                    if (resource.size >= 10 * 1000 * 1000) {
                                        logger.warn(`Uploading a large resource (resourceId: ${local.id}, size:${resource.size} bytes) which may tie up the sync process.`);
                                    }
                                    // We skip updating the blob if it hasn't
                                    // been modified since the last sync. In
                                    // that case, it means the resource metadata
                                    // (title, filename, etc.) has been changed,
                                    // but not the data blob.
                                    const syncItem = await BaseItem_1.default.syncItem(syncTargetId, resource.id, { fields: ['sync_time', 'force_sync'] });
                                    if (!syncItem || syncItem.sync_time < resource.blob_updated_time || syncItem.force_sync) {
                                        await this.apiCall('put', remoteContentPath, null, { path: localResourceContentPath, source: 'file', shareId: resource.share_id });
                                    }
                                }
                                catch (error) {
                                    if (isCannotSyncError(error)) {
                                        await handleCannotSyncItem(ItemClass, syncTargetId, local, error.message);
                                        action = null;
                                    }
                                    else if (error && error.code === errors_1.ErrorCode.IsReadOnly) {
                                        action = getConflictType(local);
                                        itemIsReadOnly = true;
                                        logger.info('Resource is readonly and cannot be modified - handling it as a conflict:', local);
                                    }
                                    else {
                                        throw error;
                                    }
                                }
                            }
                        }
                        if (action === types_1.SyncAction.CreateRemote || action === types_1.SyncAction.UpdateRemote) {
                            let canSync = true;
                            try {
                                if (this.testingHooks_.indexOf('notesRejectedByTarget') >= 0 && local.type_ === BaseModel_1.default.TYPE_NOTE)
                                    throw new JoplinError_1.default('Testing rejectedByTarget', 'rejectedByTarget');
                                if (this.testingHooks_.indexOf('itemIsReadOnly') >= 0)
                                    throw new JoplinError_1.default('Testing isReadOnly', errors_1.ErrorCode.IsReadOnly);
                                await itemUploader.serializeAndUploadItem(ItemClass, path, local);
                            }
                            catch (error) {
                                if (error && error.code === 'rejectedByTarget') {
                                    await handleCannotSyncItem(ItemClass, syncTargetId, local, error.message);
                                    canSync = false;
                                }
                                else if (error && error.code === errors_1.ErrorCode.IsReadOnly) {
                                    action = getConflictType(local);
                                    itemIsReadOnly = true;
                                    canSync = false;
                                }
                                else {
                                    throw error;
                                }
                            }
                            // Note: Currently, we set sync_time to update_time, which should work fine given that the resolution is the millisecond.
                            // In theory though, this could happen:
                            //
                            // 1. t0: Editor: Note is modified
                            // 2. t0: Sync: Found that note was modified so start uploading it
                            // 3. t0: Editor: Note is modified again
                            // 4. t1: Sync: Note has finished uploading, set sync_time to t0
                            //
                            // Later any attempt to sync will not detect that note was modified in (3) (within the same millisecond as it was being uploaded)
                            // because sync_time will be t0 too.
                            //
                            // The solution would be to use something like an etag (a simple counter incremented on every change) to make sure each
                            // change is uniquely identified. Leaving it like this for now.
                            if (canSync) {
                                // 2018-01-21: Setting timestamp is not needed because the delta() logic doesn't rely
                                // on it (instead it uses a more reliable `context` object) and the itemsThatNeedSync loop
                                // above also doesn't use it because it fetches the whole remote object and read the
                                // more reliable 'updated_time' property. Basically remote.updated_time is deprecated.
                                // 2025-08-27: remote.updated_time can now be utilised by the basic delta when using a sync target
                                // where the 'server' is actually the same device that is running the client eg. file system sync.
                                // This is required to correctly detect updated objects where an external sync service is being
                                // used in combination with Joplin, as there are essentially multiple sources of truth, rather
                                // than just one. So we can't rely on the server always containing the latest remote changes
                                // during synchronization, as new changes can be later added which have a timestamp in the past.
                                // In this scenario, we don't know the exact timestamp to specify for remoteItemUpdatedTime upon
                                // uploading. So we can leave it unspecified and then on the next run of the delta step, it will
                                // get set there
                                await ItemClass.saveSyncTime(syncTargetId, local, local.updated_time);
                            }
                        }
                        await (0, handleConflictAction_1.default)(action, ItemClass, !!remote, remoteContent, local, syncTargetId, itemIsReadOnly, 
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                        (action) => this.dispatch(action));
                        completeItemProcessing(path);
                    }
                    if (!result.hasMore)
                        break;
                }
            } // UPLOAD STEP
            // ------------------------------------------------------------------------
            // 3. DELTA
            // ------------------------------------------------------------------------
            // Loop through all the remote items, find those that
            // have been created or updated, and apply the changes to local.
            // ------------------------------------------------------------------------
            if (this.downloadQueue_)
                await this.downloadQueue_.stop();
            this.downloadQueue_ = new TaskQueue_1.default('syncDownload');
            this.downloadQueue_.logger_ = logger;
            if (syncSteps.indexOf('delta') >= 0) {
                // At this point all the local items that have changed have been pushed to remote
                // or handled as conflicts, so no conflict is possible after this.
                let context = null;
                let newDeltaContext = null;
                const localFoldersToDelete = [];
                let hasCancelled = false;
                if (lastContext.delta)
                    context = lastContext.delta;
                while (true) {
                    if (this.cancelling() || hasCancelled)
                        break;
                    const listResult = await this.apiCall('delta', '', {
                        context: context,
                        // allItemIdsHandler() provides a way for drivers that don't have a delta API to
                        // still provide delta functionality by comparing the items they have to the items
                        // the client has. Very inefficient but that's the only possible workaround.
                        // It's a function so that it is only called if the driver needs these IDs. For
                        // drivers with a delta functionality it's a noop.
                        allItemIdsHandler: async () => {
                            return BaseItem_1.default.syncedItemIds(syncTargetId);
                        },
                        // This is only used by the basic delta
                        allItemMetadataHandler: async () => {
                            return BaseItem_1.default.remoteItemMetadata(syncTargetId);
                        },
                        wipeOutFailSafe: Setting_1.default.value('sync.wipeOutFailSafe'),
                        logger: logger,
                    });
                    // Ensure that if the sync target directory has changed, lost access, or has been purged by some external process while the sync is running, that a failsafe error is triggered where info.json and .sync/version.txt can no longer be found
                    // This check is more reliable than checking the count of items alone, as it is possible for sync items become segmented between 2 directories, possibly by the target directory changing during sync
                    // This scenario is possible with OneDrive sync, see https://github.com/laurent22/joplin/issues/11489
                    // This check while the sync is running is only necessary for the delta step of the sync, as this is where local deletions are calculated by comparing the local database and the sync target. These deletions are driven by the listResult field to determine which remote items exist
                    // As long as we check that info.json still exists after each time the listResult field is repopulated, there should not be a risk of unwanted deletions when failsafe is enabled, unless the target directory is directly manipulated by the user
                    await (0, syncInfoUtils_1.checkSyncTargetIsValid)(this.api());
                    const supportsDeltaWithItems = (0, file_api_1.getSupportsDeltaWithItems)(listResult);
                    logger.info('supportsDeltaWithItems = ', supportsDeltaWithItems);
                    const remotes = listResult.items;
                    this.logSyncOperation('fetchingTotal', null, null, 'Fetching delta items from sync target', remotes.length);
                    const remoteIds = remotes.map(r => BaseItem_1.default.pathToId(r.path));
                    const locals = await BaseItem_1.default.loadItemsByIds(remoteIds);
                    for (const remote of remotes) {
                        if (this.cancelling())
                            break;
                        let needsToDownload = true;
                        if (this.api().supportsAccurateTimestamp) {
                            const local = locals.find(l => l.id === BaseItem_1.default.pathToId(remote.path));
                            if (local && local.updated_time === remote.jop_updated_time)
                                needsToDownload = false;
                        }
                        if (supportsDeltaWithItems) {
                            needsToDownload = false;
                        }
                        if (needsToDownload) {
                            this.downloadQueue_.push(remote.path, async () => {
                                return this.apiCall('get', remote.path);
                            });
                        }
                    }
                    for (let i = 0; i < remotes.length; i++) {
                        if (this.cancelling() || this.testingHooks_.indexOf('cancelDeltaLoop2') >= 0) {
                            hasCancelled = true;
                            break;
                        }
                        this.logSyncOperation('fetchingProcessed', null, null, 'Processing fetched item');
                        const remote = remotes[i];
                        if (!BaseItem_1.default.isSystemPath(remote.path))
                            continue; // The delta API might return things like the .sync, .resource or the root folder
                        const loadContent = async () => {
                            if (supportsDeltaWithItems)
                                return remote.jopItem;
                            const task = await this.downloadQueue_.waitForResult(path);
                            if (task.error)
                                throw task.error;
                            if (!task.result)
                                return null;
                            return await BaseItem_1.default.unserialize(task.result);
                        };
                        const path = remote.path;
                        const remoteId = BaseItem_1.default.pathToId(path);
                        let action = null;
                        let reason = '';
                        let local = locals.find(l => l.id === remoteId);
                        let ItemClass = null;
                        let content = null;
                        try {
                            if (!local) {
                                if (remote.isDeleted !== true) {
                                    action = types_1.SyncAction.CreateLocal;
                                    reason = 'remote exists but local does not';
                                    content = await loadContent();
                                    ItemClass = content ? BaseItem_1.default.itemClass(content) : null;
                                }
                            }
                            else {
                                ItemClass = BaseItem_1.default.itemClass(local);
                                local = ItemClass.filter(local);
                                if (remote.isDeleted) {
                                    action = types_1.SyncAction.DeleteLocal;
                                    reason = 'remote has been deleted';
                                }
                                else {
                                    if (this.api().supportsAccurateTimestamp && remote.jop_updated_time === local.updated_time) {
                                        // Nothing to do, and no need to fetch the content
                                    }
                                    else {
                                        content = await loadContent();
                                        if (content && content.updated_time > local.updated_time) {
                                            action = types_1.SyncAction.UpdateLocal;
                                            reason = 'remote is more recent than local';
                                        }
                                        else if ((0, file_api_1.enableEnhancedBasicDeltaAlgorithm)()) {
                                            // When the enhanced basic delta algorithm is first used, all items are rescanned and we need to persist the remoteItemUpdatedTime
                                            // to set up the initial synced state. This also catches the case if content.updated_time < local.updated_time due to manual manipulation
                                            // of the md files, to prevent these items being continually fetched on every sync
                                            await ItemClass.saveSyncTime(syncTargetId, local, local.updated_time, remote.updated_time);
                                        }
                                    }
                                }
                            }
                        }
                        catch (error) {
                            if (error.code === 'rejectedByTarget') {
                                this.progressReport_.errors.push(error);
                                logger.warn(`Rejected by target: ${path}: ${error.message}`);
                                action = null;
                            }
                            else {
                                error.message = `On file ${path}: ${error.message}`;
                                throw error;
                            }
                        }
                        if (this.testingHooks_.indexOf('skipRevisions') >= 0 && content && content.type_ === BaseModel_1.default.TYPE_REVISION)
                            action = null;
                        if (!action)
                            continue;
                        this.logSyncOperation(action, local, remote, reason);
                        if (action === types_1.SyncAction.CreateLocal || action === types_1.SyncAction.UpdateLocal) {
                            if (content === null) {
                                logger.warn(`Remote has been deleted between now and the delta() call? In that case it will be handled during the next sync: ${path}`);
                                continue;
                            }
                            content = ItemClass.filter(content);
                            // 2017-12-03: This was added because the new user_updated_time and user_created_time properties were added
                            // to the items. However changing the database is not enough since remote items that haven't been synced yet
                            // will not have these properties and, since they are required, it would cause a problem. So this check
                            // if they are present and, if not, set them to a reasonable default.
                            // Let's leave these two lines for 6 months, by which time all the clients should have been synced.
                            if (!content.user_updated_time)
                                content.user_updated_time = content.updated_time;
                            if (!content.user_created_time)
                                content.user_created_time = content.created_time;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                            const options = {
                                autoTimestamp: false,
                                nextQueries: BaseItem_1.default.updateSyncTimeQueries(syncTargetId, content, time_1.default.unixMs(), remote.updated_time),
                                changeSource: ItemChange_1.default.SOURCE_SYNC,
                            };
                            if (action === types_1.SyncAction.CreateLocal)
                                options.isNew = true;
                            if (action === types_1.SyncAction.UpdateLocal)
                                options.oldItem = local;
                            const creatingOrUpdatingResource = content.type_ === BaseModel_1.default.TYPE_RESOURCE && (action === types_1.SyncAction.CreateLocal || action === types_1.SyncAction.UpdateLocal);
                            if (creatingOrUpdatingResource) {
                                if (content.size >= this.maxResourceSize()) {
                                    await handleCannotSyncItem(ItemClass, syncTargetId, content, `File "${content.title}" is larger than allowed ${this.maxResourceSize()} bytes. Beyond this limit, the mobile app would crash.`, BaseItem_1.default.SYNC_ITEM_LOCATION_REMOTE);
                                    continue;
                                }
                                await ResourceLocalState_1.default.save({ resource_id: content.id, fetch_status: Resource_1.default.FETCH_STATUS_IDLE });
                            }
                            if (content.type_ === BaseModel_1.ModelType.MasterKey) {
                                // Special case for master keys - if we download
                                // one, we only add it to the store if it's not
                                // already there. That can happen for example if
                                // the new E2EE migration was processed at a
                                // time a master key was still on the sync
                                // target. In that case, info.json would not
                                // have it.
                                //
                                // If info.json already has the key we shouldn't
                                // update because the most up to date keys
                                // should always be in info.json now.
                                const existingMasterKey = await MasterKey_1.default.load(content.id);
                                if (!existingMasterKey) {
                                    logger.info(`Downloaded a master key that was not in info.json - adding it to the store. ID: ${content.id}`);
                                    await MasterKey_1.default.save(content);
                                }
                            }
                            else {
                                await ItemClass.save(content, options);
                            }
                            if (creatingOrUpdatingResource)
                                this.dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: content.id });
                            // if (!hasAutoEnabledEncryption && content.type_ === BaseModel.TYPE_MASTER_KEY && !masterKeysBefore) {
                            // 	hasAutoEnabledEncryption = true;
                            // 	logger.info('One master key was downloaded and none was previously available: automatically enabling encryption');
                            // 	logger.info('Using master key: ', content.id);
                            // 	await this.encryptionService().enableEncryption(content);
                            // 	await this.encryptionService().loadMasterKeysFromSettings();
                            // 	logger.info('Encryption has been enabled with downloaded master key as active key. However, note that no password was initially supplied. It will need to be provided by user.');
                            // }
                            if (content.encryption_applied)
                                this.dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
                        }
                        else if (action === types_1.SyncAction.DeleteLocal) {
                            if (local.type_ === BaseModel_1.default.TYPE_FOLDER) {
                                localFoldersToDelete.push(local);
                                continue;
                            }
                            const ItemClass = BaseItem_1.default.itemClass(local.type_);
                            await ItemClass.delete(local.id, {
                                trackDeleted: false,
                                changeSource: ItemChange_1.default.SOURCE_SYNC,
                                sourceDescription: 'sync: deleteLocal',
                            });
                        }
                    }
                    // If user has cancelled, don't record the new context (2) so that synchronisation
                    // can start again from the previous context (1) next time. It is ok if some items
                    // have been synced between (1) and (2) because the loop above will handle the same
                    // items being synced twice as an update. If the local and remote items are identical
                    // the update will simply be skipped.
                    if (!hasCancelled) {
                        if (options.saveContextHandler) {
                            const deltaToSave = Object.assign({}, listResult.context);
                            // Remove these two variables because they can be large and can be rebuilt
                            // the next time the sync is started.
                            delete deltaToSave.statsCache;
                            delete deltaToSave.statIdsCache;
                            options.saveContextHandler({ delta: deltaToSave });
                        }
                        if (!listResult.hasMore) {
                            newDeltaContext = listResult.context;
                            break;
                        }
                        context = listResult.context;
                    }
                }
                outputContext.delta = newDeltaContext ? newDeltaContext : lastContext.delta;
                // ------------------------------------------------------------------------
                // Delete the folders that have been collected in the loop above.
                // Folders are always deleted last, and only if they are empty.
                // If they are not empty it's considered a conflict since whatever deleted
                // them should have deleted their content too. In that case, all its notes
                // are marked as "is_conflict".
                // ------------------------------------------------------------------------
                if (!this.cancelling()) {
                    for (let i = 0; i < localFoldersToDelete.length; i++) {
                        const item = localFoldersToDelete[i];
                        const noteIds = await Folder_1.default.noteIds(item.id);
                        if (noteIds.length) {
                            // CONFLICT
                            await Folder_1.default.markNotesAsConflict(item.id);
                        }
                        const deletionOptions = {
                            deleteChildren: false,
                            trackDeleted: false,
                            changeSource: ItemChange_1.default.SOURCE_SYNC,
                            sourceDescription: 'Sync',
                        };
                        await Folder_1.default.delete(item.id, deletionOptions);
                    }
                }
                if (!this.cancelling()) {
                    await BaseItem_1.default.deleteOrphanSyncItems();
                }
            } // DELTA STEP
        }
        catch (error) {
            hasCaughtError = true;
            if (error.code === errors_1.ErrorCode.MustUpgradeApp) {
                this.dispatch({
                    type: 'MUST_UPGRADE_APP',
                    message: error.message,
                });
            }
            if (throwOnError) {
                errorToThrow = error;
            }
            else if (error && ['cannotEncryptEncrypted', 'noActiveMasterKey', 'processingPathTwice', 'failSafe', 'lockError', 'outdatedSyncTarget'].indexOf(error.code) >= 0) {
                // Only log an info statement for this since this is a common condition that is reported
                // in the application, and needs to be resolved by the user.
                // Or it's a temporary issue that will be resolved on next sync.
                logger.info(error.message);
                if (error.code === 'failSafe' || error.code === 'lockError') {
                    // Get the message to display on UI, but not in testing to avoid polluting stdout
                    if (!shim_1.default.isTestingEnv())
                        this.progressReport_.errors.push(error.message);
                    this.logLastRequests();
                }
            }
            else if (error.code === 'unknownItemType') {
                this.progressReport_.errors.push((0, locale_1._)('Unknown item type downloaded - please upgrade Joplin to the latest version'));
                logger.error(error);
            }
            else if (error.code === 'changedDuringSync') {
                // We want to re-trigger the sync in this scenario
                hasCaughtError = false;
                logger.info(error.message);
            }
            else {
                logger.error(error);
                if (error.details)
                    logger.error('Details:', error.details);
                const isLocalWebDavServer = Setting_1.default.value('sync.target') === SyncTargetRegistry_1.default.nameToId('webdav') && (0, file_api_1.isLocalServer)(Setting_1.default.value('sync.6.path'));
                // Don't save to the report errors that are due to things like temporary network errors or timeout, except if using a local WebDAV server, in which
                // case timeout errors can occur when the server is actually down. Those type of errors happen consistently when a local server is down when using
                // the Android app in particular, but they can also happen on the desktop app in some circumstances. The usage of a local WebDAV server is most useful
                // on Android, as it can be used as an alternative to file system sync, in order to work around performance issues related to SAF
                if (!shim_1.default.fetchRequestCanBeRetried(error) || isLocalWebDavServer) {
                    this.progressReport_.errors.push(error);
                    this.logLastRequests();
                }
            }
        }
        if (syncLock) {
            this.lockHandler().stopAutoLockRefresh(syncLock);
            await this.lockHandler().releaseLock(LockHandler_1.LockType.Sync, this.lockClientType(), this.clientId_);
        }
        this.syncTargetIsLocked_ = false;
        let cancelledBeforeClearedState = false;
        if (this.cancelling()) {
            logger.info('Synchronisation was cancelled.');
            this.cancelling_ = false;
            cancelledBeforeClearedState = true;
        }
        this.progressReport_.completedTime = time_1.default.unixMs();
        this.logSyncOperation('finished', null, null, `Synchronisation finished [${synchronizationId}]`);
        await this.logSyncSummary(this.progressReport_);
        const hasErrors = Synchronizer.reportHasErrors(this.progressReport_);
        eventManager_1.default.emit(eventManager_1.EventName.SyncComplete, {
            withErrors: hasErrors,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        await (0, checkDisabledSyncItemsNotification_1.default)((action) => this.dispatch(action));
        this.onProgress_ = function () { };
        this.progressReport_ = {};
        this.dispatch({ type: 'SYNC_COMPLETED', isFullSync: this.isFullSync(syncSteps) });
        this.state_ = 'idle';
        if (errorToThrow)
            throw errorToThrow;
        // If there are any un-synced outgoing changes made up to the point just before the sync completes, then trigger the sync again to reduce the likelihood
        // that the user will close or minimise the app when there are un-synced changes, because the sync is reported as completed.
        // IMPORTANT: This must be the very last step in the sync, to avoid any window to allow an un-synced change to get missed
        if (!hasErrors && !hasCaughtError && !cancelledBeforeClearedState && !this.cancelling()) {
            const result = await BaseItem_1.default.itemsThatNeedSync(syncTargetId);
            if (result.items.length > 0) {
                logger.info('There are more outgoing changes to sync, schedule the sync again');
                void registry_1.reg.scheduleSync(registry_1.reg.syncAsYouTypeInterval(), { syncSteps }, true);
            }
        }
        return outputContext;
    }
}
Synchronizer.verboseMode = true;
exports.default = Synchronizer;
