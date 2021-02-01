"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reg = void 0;
const Logger_1 = require("./Logger");
const Setting_1 = require("./models/Setting");
const shim_1 = require("./shim");
const SyncTargetRegistry = require('./SyncTargetRegistry.js');
class Registry {
    constructor() {
        this.syncTargets_ = {};
        this.logger_ = null;
        this.schedSyncCalls_ = [];
        this.waitForReSyncCalls_ = [];
        this.setupRecurrentCalls_ = [];
        this.timerCallbackCalls_ = [];
        this.syncTarget = (syncTargetId = null) => {
            if (syncTargetId === null)
                syncTargetId = Setting_1.default.value('sync.target');
            if (this.syncTargets_[syncTargetId])
                return this.syncTargets_[syncTargetId];
            const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
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
        this.waitForSyncFinishedThenSync = () => __awaiter(this, void 0, void 0, function* () {
            this.waitForReSyncCalls_.push(true);
            try {
                const synchronizer = yield this.syncTarget().synchronizer();
                yield synchronizer.waitForSyncToFinish();
                yield this.scheduleSync(0);
            }
            finally {
                this.waitForReSyncCalls_.pop();
            }
        });
        this.scheduleSync = (delay = null, syncOptions = null) => __awaiter(this, void 0, void 0, function* () {
            this.schedSyncCalls_.push(true);
            try {
                if (delay === null)
                    delay = 1000 * 10;
                if (syncOptions === null)
                    syncOptions = {};
                let promiseResolve = null;
                const promise = new Promise((resolve) => {
                    promiseResolve = resolve;
                });
                if (this.scheduleSyncId_) {
                    shim_1.default.clearTimeout(this.scheduleSyncId_);
                    this.scheduleSyncId_ = null;
                }
                this.logger().debug('Scheduling sync operation...', delay);
                if (Setting_1.default.value('env') === 'dev' && delay !== 0) {
                    this.logger().info('Schedule sync DISABLED!!!');
                    return;
                }
                const timeoutCallback = () => __awaiter(this, void 0, void 0, function* () {
                    this.timerCallbackCalls_.push(true);
                    try {
                        this.scheduleSyncId_ = null;
                        this.logger().info('Preparing scheduled sync');
                        const syncTargetId = Setting_1.default.value('sync.target');
                        if (!(yield this.syncTarget(syncTargetId).isAuthenticated())) {
                            this.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
                            promiseResolve();
                            return;
                        }
                        try {
                            const sync = yield this.syncTarget(syncTargetId).synchronizer();
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
                                const options = Object.assign({}, syncOptions, { context: context });
                                if (!options.saveContextHandler) {
                                    options.saveContextHandler = (newContext) => {
                                        Setting_1.default.setValue(contextKey, JSON.stringify(newContext));
                                    };
                                }
                                const newContext = yield sync.start(options);
                                Setting_1.default.setValue(contextKey, JSON.stringify(newContext));
                            }
                            catch (error) {
                                if (error.code == 'alreadyStarted') {
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
                });
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
        });
        this.setDb = (v) => {
            this.db_ = v;
        };
        this.cancelTimers = () => __awaiter(this, void 0, void 0, function* () {
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
        });
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
    setShowErrorMessageBoxHandler(v) {
        this.showErrorMessageBoxHandler_ = v;
    }
    showErrorMessageBox(message) {
        if (!this.showErrorMessageBoxHandler_)
            return;
        this.showErrorMessageBoxHandler_(message);
    }
    resetSyncTarget(syncTargetId = null) {
        if (syncTargetId === null)
            syncTargetId = Setting_1.default.value('sync.target');
        delete this.syncTargets_[syncTargetId];
    }
    syncTargetNextcloud() {
        return this.syncTarget(SyncTargetRegistry.nameToId('nextcloud'));
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
                    void this.scheduleSync(0);
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
//# sourceMappingURL=registry.js.map