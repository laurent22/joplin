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
exports.basicDelta = exports.FileApi = void 0;
const Logger_1 = require("./Logger");
const shim_1 = require("./shim");
const BaseItem_1 = require("./models/BaseItem");
const time_1 = require("./time");
const { isHidden } = require('./path-utils');
const JoplinError = require('./JoplinError');
const ArrayUtils = require('./ArrayUtils');
const { sprintf } = require('sprintf-js');
const Mutex = require('async-mutex').Mutex;
const logger = Logger_1.default.create('FileApi');
function requestCanBeRepeated(error) {
    const errorCode = typeof error === 'object' && error.code ? error.code : null;
    // The target is explicitely rejecting the item so repeating wouldn't make a difference.
    if (errorCode === 'rejectedByTarget')
        return false;
    // We don't repeat failSafe errors because it's an indication of an issue at the
    // server-level issue which usually cannot be fixed by repeating the request.
    // Also we print the previous requests and responses to the log in this case,
    // so not repeating means there will be less noise in the log.
    if (errorCode === 'failSafe')
        return false;
    return true;
}
function tryAndRepeat(fn, count) {
    return __awaiter(this, void 0, void 0, function* () {
        let retryCount = 0;
        // Don't use internal fetch retry mechanim since we
        // are already retrying here.
        const shimFetchMaxRetryPrevious = shim_1.default.fetchMaxRetrySet(0);
        const defer = () => {
            shim_1.default.fetchMaxRetrySet(shimFetchMaxRetryPrevious);
        };
        while (true) {
            try {
                const result = yield fn();
                defer();
                return result;
            }
            catch (error) {
                if (retryCount >= count || !requestCanBeRepeated(error)) {
                    defer();
                    throw error;
                }
                retryCount++;
                yield time_1.default.sleep(1 + retryCount * 3);
            }
        }
    });
}
class FileApi {
    constructor(baseDir, driver) {
        this.logger_ = new Logger_1.default();
        this.syncTargetId_ = null;
        this.tempDirName_ = null;
        this.requestRepeatCount_ = null; // For testing purpose only - normally this value should come from the driver
        this.remoteDateOffset_ = 0;
        this.remoteDateNextCheckTime_ = 0;
        this.remoteDateMutex_ = new Mutex();
        this.initialized_ = false;
        this.baseDir_ = baseDir;
        this.driver_ = driver;
        this.driver_.fileApi_ = this;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized_)
                return;
            this.initialized_ = true;
            if (this.driver_.initialize)
                return this.driver_.initialize(this.fullPath(''));
        });
    }
    fetchRemoteDateOffset_() {
        return __awaiter(this, void 0, void 0, function* () {
            const tempFile = `${this.tempDirName()}/timeCheck${Math.round(Math.random() * 1000000)}.txt`;
            const startTime = Date.now();
            yield this.put(tempFile, 'timeCheck');
            // Normally it should be possible to read the file back immediately but
            // just in case, read it in a loop.
            const loopStartTime = Date.now();
            let stat = null;
            while (Date.now() - loopStartTime < 5000) {
                stat = yield this.stat(tempFile);
                if (stat)
                    break;
                yield time_1.default.msleep(200);
            }
            if (!stat)
                throw new Error('Timed out trying to get sync target clock time');
            void this.delete(tempFile); // No need to await for this call
            const endTime = Date.now();
            const expectedTime = Math.round((endTime + startTime) / 2);
            return stat.updated_time - expectedTime;
        });
    }
    // Approximates the current time on the sync target. It caches the time offset to
    // improve performance.
    remoteDate() {
        return __awaiter(this, void 0, void 0, function* () {
            const shouldSyncTime = () => {
                return !this.remoteDateNextCheckTime_ || Date.now() > this.remoteDateNextCheckTime_;
            };
            if (shouldSyncTime()) {
                const release = yield this.remoteDateMutex_.acquire();
                try {
                    // Another call might have refreshed the time while we were waiting for the mutex,
                    // so check again if we need to refresh.
                    if (shouldSyncTime()) {
                        this.remoteDateOffset_ = yield this.fetchRemoteDateOffset_();
                        // The sync target clock should rarely change but the device one might,
                        // so we need to refresh relatively frequently.
                        this.remoteDateNextCheckTime_ = Date.now() + 10 * 60 * 1000;
                    }
                }
                catch (error) {
                    logger.warn('Could not retrieve remote date - defaulting to device date:', error);
                    this.remoteDateOffset_ = 0;
                    this.remoteDateNextCheckTime_ = Date.now() + 60 * 1000;
                }
                finally {
                    release();
                }
            }
            return new Date(Date.now() + this.remoteDateOffset_);
        });
    }
    // Ideally all requests repeating should be done at the FileApi level to remove duplicate code in the drivers, but
    // historically some drivers (eg. OneDrive) are already handling request repeating, so this is optional, per driver,
    // and it defaults to no repeating.
    requestRepeatCount() {
        if (this.requestRepeatCount_ !== null)
            return this.requestRepeatCount_;
        if (this.driver_.requestRepeatCount)
            return this.driver_.requestRepeatCount();
        return 0;
    }
    lastRequests() {
        return this.driver_.lastRequests ? this.driver_.lastRequests() : [];
    }
    clearLastRequests() {
        if (this.driver_.clearLastRequests)
            this.driver_.clearLastRequests();
    }
    baseDir() {
        return typeof this.baseDir_ === 'function' ? this.baseDir_() : this.baseDir_;
    }
    tempDirName() {
        if (this.tempDirName_ === null)
            throw Error('Temp dir not set!');
        return this.tempDirName_;
    }
    setTempDirName(v) {
        this.tempDirName_ = v;
    }
    fsDriver() {
        return shim_1.default.fsDriver();
    }
    driver() {
        return this.driver_;
    }
    setSyncTargetId(v) {
        this.syncTargetId_ = v;
    }
    syncTargetId() {
        if (this.syncTargetId_ === null)
            throw new Error('syncTargetId has not been set!!');
        return this.syncTargetId_;
    }
    setLogger(l) {
        if (!l)
            l = new Logger_1.default();
        this.logger_ = l;
    }
    logger() {
        return this.logger_;
    }
    fullPath(path) {
        const output = [];
        if (this.baseDir())
            output.push(this.baseDir());
        if (path)
            output.push(path);
        return output.join('/');
    }
    // DRIVER MUST RETURN PATHS RELATIVE TO `path`
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    list(path = '', options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                options = {};
            if (!('includeHidden' in options))
                options.includeHidden = false;
            if (!('context' in options))
                options.context = null;
            if (!('includeDirs' in options))
                options.includeDirs = true;
            if (!('syncItemsOnly' in options))
                options.syncItemsOnly = false;
            logger.debug(`list ${this.baseDir()}`);
            const result = yield tryAndRepeat(() => this.driver_.list(this.fullPath(path), options), this.requestRepeatCount());
            if (!options.includeHidden) {
                const temp = [];
                for (let i = 0; i < result.items.length; i++) {
                    if (!isHidden(result.items[i].path))
                        temp.push(result.items[i]);
                }
                result.items = temp;
            }
            if (!options.includeDirs) {
                result.items = result.items.filter((f) => !f.isDir);
            }
            if (options.syncItemsOnly) {
                result.items = result.items.filter((f) => !f.isDir && BaseItem_1.default.isSystemPath(f.path));
            }
            return result;
        });
    }
    // Deprectated
    setTimestamp(path, timestampMs) {
        logger.debug(`setTimestamp ${this.fullPath(path)}`);
        return tryAndRepeat(() => this.driver_.setTimestamp(this.fullPath(path), timestampMs), this.requestRepeatCount());
        // return this.driver_.setTimestamp(this.fullPath(path), timestampMs);
    }
    mkdir(path) {
        logger.debug(`mkdir ${this.fullPath(path)}`);
        return tryAndRepeat(() => this.driver_.mkdir(this.fullPath(path)), this.requestRepeatCount());
    }
    stat(path) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`stat ${this.fullPath(path)}`);
            const output = yield tryAndRepeat(() => this.driver_.stat(this.fullPath(path)), this.requestRepeatCount());
            if (!output)
                return output;
            output.path = path;
            return output;
            // return this.driver_.stat(this.fullPath(path)).then((output) => {
            // 	if (!output) return output;
            // 	output.path = path;
            // 	return output;
            // });
        });
    }
    // Returns UTF-8 encoded string by default, or a Response if `options.target = 'file'`
    get(path, options = null) {
        if (!options)
            options = {};
        if (!options.encoding)
            options.encoding = 'utf8';
        logger.debug(`get ${this.fullPath(path)}`);
        return tryAndRepeat(() => this.driver_.get(this.fullPath(path), options), this.requestRepeatCount());
    }
    put(path, content, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`put ${this.fullPath(path)}`, options);
            if (options && options.source === 'file') {
                if (!(yield this.fsDriver().exists(options.path)))
                    throw new JoplinError(`File not found: ${options.path}`, 'fileNotFound');
            }
            return tryAndRepeat(() => this.driver_.put(this.fullPath(path), content, options), this.requestRepeatCount());
        });
    }
    delete(path) {
        logger.debug(`delete ${this.fullPath(path)}`);
        return tryAndRepeat(() => this.driver_.delete(this.fullPath(path)), this.requestRepeatCount());
    }
    // Deprectated
    move(oldPath, newPath) {
        logger.debug(`move ${this.fullPath(oldPath)} => ${this.fullPath(newPath)}`);
        return tryAndRepeat(() => this.driver_.move(this.fullPath(oldPath), this.fullPath(newPath)), this.requestRepeatCount());
    }
    // Deprectated
    format() {
        return tryAndRepeat(() => this.driver_.format(), this.requestRepeatCount());
    }
    clearRoot() {
        return tryAndRepeat(() => this.driver_.clearRoot(this.baseDir()), this.requestRepeatCount());
    }
    delta(path, options = null) {
        logger.debug(`delta ${this.fullPath(path)}`);
        return tryAndRepeat(() => this.driver_.delta(this.fullPath(path), options), this.requestRepeatCount());
    }
}
exports.FileApi = FileApi;
function basicDeltaContextFromOptions_(options) {
    const output = {
        timestamp: 0,
        filesAtTimestamp: [],
        statsCache: null,
        statIdsCache: null,
        deletedItemsProcessed: false,
    };
    if (!options || !options.context)
        return output;
    const d = new Date(options.context.timestamp);
    output.timestamp = isNaN(d.getTime()) ? 0 : options.context.timestamp;
    output.filesAtTimestamp = Array.isArray(options.context.filesAtTimestamp) ? options.context.filesAtTimestamp.slice() : [];
    output.statsCache = options.context && options.context.statsCache ? options.context.statsCache : null;
    output.statIdsCache = options.context && options.context.statIdsCache ? options.context.statIdsCache : null;
    output.deletedItemsProcessed = options.context && 'deletedItemsProcessed' in options.context ? options.context.deletedItemsProcessed : false;
    return output;
}
// This is the basic delta algorithm, which can be used in case the cloud service does not have
// a built-in delta API. OneDrive and Dropbox have one for example, but Nextcloud and obviously
// the file system do not.
function basicDelta(path, getDirStatFn, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const outputLimit = 50;
        const itemIds = yield options.allItemIdsHandler();
        if (!Array.isArray(itemIds))
            throw new Error('Delta API not supported - local IDs must be provided');
        const logger = options && options.logger ? options.logger : new Logger_1.default();
        const context = basicDeltaContextFromOptions_(options);
        if (context.timestamp > Date.now()) {
            logger.warn(`BasicDelta: Context timestamp is greater than current time: ${context.timestamp}`);
            logger.warn('BasicDelta: Sync will continue but it is likely that nothing will be synced');
        }
        const newContext = {
            timestamp: context.timestamp,
            filesAtTimestamp: context.filesAtTimestamp.slice(),
            statsCache: context.statsCache,
            statIdsCache: context.statIdsCache,
            deletedItemsProcessed: context.deletedItemsProcessed,
        };
        // Stats are cached until all items have been processed (until hasMore is false)
        if (newContext.statsCache === null) {
            newContext.statsCache = yield getDirStatFn(path);
            newContext.statsCache.sort(function (a, b) {
                return a.updated_time - b.updated_time;
            });
            newContext.statIdsCache = newContext.statsCache.filter((item) => BaseItem_1.default.isSystemPath(item.path)).map((item) => BaseItem_1.default.pathToId(item.path));
            newContext.statIdsCache.sort(); // Items must be sorted to use binary search below
        }
        let output = [];
        const updateReport = {
            timestamp: context.timestamp,
            older: 0,
            newer: 0,
            equal: 0,
        };
        // Find out which files have been changed since the last time. Note that we keep
        // both the timestamp of the most recent change, *and* the items that exactly match
        // this timestamp. This to handle cases where an item is modified while this delta
        // function is running. For example:
        // t0: Item 1 is changed
        // t0: Sync items - run delta function
        // t0: While delta() is running, modify Item 2
        // Since item 2 was modified within the same millisecond, it would be skipped in the
        // next sync if we relied exclusively on a timestamp.
        for (let i = 0; i < newContext.statsCache.length; i++) {
            const stat = newContext.statsCache[i];
            if (stat.isDir)
                continue;
            if (stat.updated_time < context.timestamp) {
                updateReport.older++;
                continue;
            }
            // Special case for items that exactly match the timestamp
            if (stat.updated_time === context.timestamp) {
                if (context.filesAtTimestamp.indexOf(stat.path) >= 0) {
                    updateReport.equal++;
                    continue;
                }
            }
            if (stat.updated_time > newContext.timestamp) {
                newContext.timestamp = stat.updated_time;
                newContext.filesAtTimestamp = [];
                updateReport.newer++;
            }
            newContext.filesAtTimestamp.push(stat.path);
            output.push(stat);
            if (output.length >= outputLimit)
                break;
        }
        logger.info(`BasicDelta: Report: ${JSON.stringify(updateReport)}`);
        if (!newContext.deletedItemsProcessed) {
            // Find out which items have been deleted on the sync target by comparing the items
            // we have to the items on the target.
            // Note that when deleted items are processed it might result in the output having
            // more items than outputLimit. This is acceptable since delete operations are cheap.
            const deletedItems = [];
            for (let i = 0; i < itemIds.length; i++) {
                const itemId = itemIds[i];
                if (ArrayUtils.binarySearch(newContext.statIdsCache, itemId) < 0) {
                    deletedItems.push({
                        path: BaseItem_1.default.systemPath(itemId),
                        isDeleted: true,
                    });
                }
            }
            const percentDeleted = itemIds.length ? deletedItems.length / itemIds.length : 0;
            // If more than 90% of the notes are going to be deleted, it's most likely a
            // configuration error or bug. For example, if the user moves their Nextcloud
            // directory, or if a network drive gets disconnected and returns an empty dir
            // instead of an error. In that case, we don't wipe out the user data, unless
            // they have switched off the fail-safe.
            if (options.wipeOutFailSafe && percentDeleted >= 0.90)
                throw new JoplinError(sprintf('Fail-safe: Sync was interrupted because %d%% of the data (%d items) is about to be deleted. To override this behaviour disable the fail-safe in the sync settings.', Math.round(percentDeleted * 100), deletedItems.length), 'failSafe');
            output = output.concat(deletedItems);
        }
        newContext.deletedItemsProcessed = true;
        const hasMore = output.length >= outputLimit;
        if (!hasMore) {
            // Clear temporary info from context. It's especially important to remove deletedItemsProcessed
            // so that they are processed again on the next sync.
            newContext.statsCache = null;
            newContext.statIdsCache = null;
            delete newContext.deletedItemsProcessed;
        }
        return {
            hasMore: hasMore,
            context: newContext,
            items: output,
        };
    });
}
exports.basicDelta = basicDelta;
//# sourceMappingURL=file-api.js.map