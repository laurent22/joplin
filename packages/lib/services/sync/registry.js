"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reg = void 0;
const Logger_1 = require("@joplin/utils/Logger");
const Setting_1 = require("./models/Setting");
const shim_1 = require("./shim");
const SyncTargetRegistry_1 = require("./SyncTargetRegistry");
class Registry {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.syncTargets_ = {};
        this.logger_ = null;
        this.schedSyncCalls_ = [];
        this.waitForReSyncCalls_ = [];
        this.setupRecurrentCalls_ = [];
        this.timerCallbackCalls_ = [];
        this.isOnMobileData_ = false;
        this.dispatch_ = (() => { });
        this.syncTarget = (syncTargetId = null) => {
            if (syncTargetId === null)
                syncTargetId = Setting_1.default.value('sync.target');
            if (this.syncTargets_[syncTargetId])
                return this.syncTargets_[syncTargetId];
            const SyncTargetClass = SyncTargetRegistry_1.default.classById(syncTargetId);
            if (!this.db())
                throw new Error('Cannot initialize sync without a db');
            const target = new SyncTargetClass(this.db());
            target.setLogger(this.logger());
            this.syncTargets_[syncTargetId] = target;
            return target;
        };
        // This can be used when some data has been modified and we want to make
        // sure it gets synced. So we wait for the current sync operation to
        // finish (if one is running), then we trigger a sync just after.
        this.waitForSyncFinishedThenSync = async () => {
            if (!Setting_1.default.value('sync.target')) {
                this.logger().info('waitForSyncFinishedThenSync - cancelling because no sync target is selected.');
                return;
            }
            this.waitForReSyncCalls_.push(true);
            try {
                const synchronizer = await this.syncTarget().synchronizer();
                await synchronizer.waitForSyncToFinish();
                await this.scheduleSync(0);
            }
            finally {
                this.waitForReSyncCalls_.pop();
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.scheduleSync = async (delay = null, syncOptions = null, doWifiConnectionCheck = false) => {
            this.schedSyncCalls_.push(true);
            try {
                if (delay === null)
                    delay = 1000 * 10;
                if (syncOptions === null)
                    syncOptions = {};
                // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
                let promiseResolve = null;
                const promise = new Promise((resolve) => {
                    promiseResolve = resolve;
                });
                if (this.scheduleSyncId_) {
                    shim_1.default.clearTimeout(this.scheduleSyncId_);
                    this.scheduleSyncId_ = null;
                }
                if (Setting_1.default.value('env') === 'dev' && delay !== 0) {
                    // this.logger().info('Schedule sync DISABLED!!!');
                    // return;
                }
                this.logger().debug('Scheduling sync operation...', delay);
                const timeoutCallback = async () => {
                    this.timerCallbackCalls_.push(true);
                    try {
                        this.scheduleSyncId_ = null;
                        this.logger().info('Preparing scheduled sync');
                        if (doWifiConnectionCheck && Setting_1.default.value('sync.mobileWifiOnly') && this.isOnMobileData_) {
                            this.logger().info('Sync cancelled because we\'re on mobile data');
                            promiseResolve();
                            return;
                        }
                        const syncTargetId = Setting_1.default.value('sync.target');
                        if (!syncTargetId) {
                            this.logger().info('Sync cancelled - no sync target is selected.');
                            promiseResolve();
                            return;
                        }
                        if (!(await this.syncTarget(syncTargetId).isAuthenticated())) {
                            this.dispatch({
                                type: 'MUST_AUTHENTICATE',
                                value: true,
                            });
                            this.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
                            promiseResolve();
                            return;
                        }
                        this.dispatch({
                            type: 'MUST_AUTHENTICATE',
                            value: false,
                        });
                        try {
                            const sync = await this.syncTarget(syncTargetId).synchronizer();
                            const contextKey = `sync.${syncTargetId}.context`;
                            let context = Setting_1.default.value(contextKey);
                            try {
                                context = context ? JSON.parse(context) : {};
                            }
                            catch (error) {
                                // Clearing the context is inefficient since it means all items are going to be re-downloaded
                                // however it won't result in duplicate items since the synchroniser is going to compare each
                                // item to the current state.
                                this.logger().warn(`Could not parse JSON sync context ${contextKey}:`, context);
                                this.logger().info('Clearing context and starting from scratch');
                                context = null;
                            }
                            try {
                                this.logger().info('Starting scheduled sync');
                                const options = Object.assign(Object.assign({}, syncOptions), { context: context });
                                if (!options.saveContextHandler) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                                    options.saveContextHandler = (newContext) => {
                                        Setting_1.default.setValue(contextKey, JSON.stringify(newContext));
                                    };
                                }
                                const newContext = await sync.start(options);
                                Setting_1.default.setValue(contextKey, JSON.stringify(newContext));
                            }
                            catch (error) {
                                if (error.code === 'alreadyStarted') {
                                    this.logger().info(error.message);
                                }
                                else {
                                    promiseResolve();
                                    throw error;
                                }
                            }
                        }
                        catch (error) {
                            this.logger().info('Could not run background sync:');
                            this.logger().info(error);
                        }
                        this.setupRecurrentSync();
                        promiseResolve();
                    }
                    finally {
                        this.timerCallbackCalls_.pop();
                    }
                };
                if (delay === 0) {
                    void timeoutCallback();
                }
                else {
                    this.scheduleSyncId_ = shim_1.default.setTimeout(timeoutCallback, delay);
                }
                return promise;
            }
            finally {
                this.schedSyncCalls_.pop();
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.setDb = (v) => {
            this.db_ = v;
        };
        this.cancelTimers = async () => {
            this.logger().info('Cancelling sync timers');
            this.cancelTimers_();
            return new Promise((resolve) => {
                shim_1.default.setInterval(() => {
                    // ensure processing complete
                    if (!this.setupRecurrentCalls_.length && !this.schedSyncCalls_.length && !this.timerCallbackCalls_.length && !this.waitForReSyncCalls_.length) {
                        this.cancelTimers_();
                        resolve(null);
                    }
                }, 100);
            });
        };
    }
    logger() {
        if (!this.logger_) {
            // console.warn('Calling logger before it is initialized');
            return new Logger_1.default();
        }
        return this.logger_;
    }
    setLogger(l) {
        this.logger_ = l;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    setShowErrorMessageBoxHandler(v) {
        this.showErrorMessageBoxHandler_ = v;
    }
    showErrorMessageBox(message) {
        if (!this.showErrorMessageBoxHandler_)
            return;
        this.showErrorMessageBoxHandler_(message);
    }
    setDispatch(dispatch) {
        this.dispatch_ = dispatch;
    }
    dispatch(action) {
        return this.dispatch_(action);
    }
    // If isOnMobileData is true, the doWifiConnectionCheck is not set
    // and the sync.mobileWifiOnly setting is true it will cancel the sync.
    setIsOnMobileData(isOnMobileData) {
        this.isOnMobileData_ = isOnMobileData;
    }
    resetSyncTarget(syncTargetId = null) {
        if (syncTargetId === null)
            syncTargetId = Setting_1.default.value('sync.target');
        delete this.syncTargets_[syncTargetId];
    }
    syncTargetNextcloud() {
        return this.syncTarget(SyncTargetRegistry_1.default.nameToId('nextcloud'));
    }
    // There is a delay of at least 1 second to avoid using excessive data usage, as the full note contents are uploaded every time a change is made.
    // On desktop this delay is longer, to avoid distraction to the user due to the sync button continually stopping and starting spinning
    syncAsYouTypeInterval() {
        if (shim_1.default.isElectron()) {
            return 15 * 1000;
        }
        else {
            return 1000;
        }
    }
    setupRecurrentSync() {
        this.setupRecurrentCalls_.push(true);
        try {
            if (this.recurrentSyncId_) {
                shim_1.default.clearInterval(this.recurrentSyncId_);
                this.recurrentSyncId_ = null;
            }
            if (!Setting_1.default.value('sync.interval')) {
                this.logger().debug('Recurrent sync is disabled');
            }
            else {
                this.logger().debug(`Setting up recurrent sync with interval ${Setting_1.default.value('sync.interval')}`);
                if (Setting_1.default.value('env') === 'dev') {
                    this.logger().info('Recurrent sync operation DISABLED!!!');
                    return;
                }
                this.recurrentSyncId_ = shim_1.default.setInterval(() => {
                    this.logger().info('Running background sync on timer...');
                    void this.scheduleSync(0, null, true);
                }, 1000 * Setting_1.default.value('sync.interval'));
            }
        }
        finally {
            this.setupRecurrentCalls_.pop();
        }
    }
    db() {
        return this.db_;
    }
    cancelTimers_() {
        if (this.recurrentSyncId_) {
            shim_1.default.clearInterval(this.recurrentSyncId_);
            this.recurrentSyncId_ = null;
        }
        if (this.scheduleSyncId_) {
            shim_1.default.clearTimeout(this.scheduleSyncId_);
            this.scheduleSyncId_ = null;
        }
    }
}
const reg = new Registry();
exports.reg = reg;
