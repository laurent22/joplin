"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLockTtl = exports.LockClientType = exports.LockType = void 0;
exports.lockNameToObject = lockNameToObject;
exports.appTypeToLockType = appTypeToLockType;
exports.hasActiveLock = hasActiveLock;
exports.activeLock = activeLock;
const types_1 = require("./utils/types");
const shim_1 = require("../../shim");
const JoplinError_1 = require("../../JoplinError");
const time_1 = require("../../time");
const Setting_1 = require("../../models/Setting");
const { fileExtension, filename } = require('../../path-utils');
var LockType;
(function (LockType) {
    LockType[LockType["None"] = 0] = "None";
    LockType[LockType["Sync"] = 1] = "Sync";
    LockType[LockType["Exclusive"] = 2] = "Exclusive";
})(LockType || (exports.LockType = LockType = {}));
var LockClientType;
(function (LockClientType) {
    LockClientType[LockClientType["Desktop"] = 1] = "Desktop";
    LockClientType[LockClientType["Mobile"] = 2] = "Mobile";
    LockClientType[LockClientType["Cli"] = 3] = "Cli";
})(LockClientType || (exports.LockClientType = LockClientType = {}));
const nullLock = () => {
    return {
        clientId: '',
        clientType: LockClientType.Desktop,
        type: LockType.None,
        id: 'NULL_LOCK',
        updatedTime: Date.now(),
    };
};
function lockIsActive(lock, currentDate, lockTtl) {
    return currentDate.getTime() - lock.updatedTime < lockTtl;
}
function lockNameToObject(name, updatedTime = null) {
    const p = name.split('_');
    const lock = {
        id: null,
        type: Number(p[0]),
        clientType: Number(p[1]),
        clientId: p[2],
        updatedTime,
    };
    if (isNaN(lock.clientType))
        throw new Error(`Invalid lock client type: ${name}`);
    if (isNaN(lock.type))
        throw new Error(`Invalid lock type: ${name}`);
    return lock;
}
function appTypeToLockType(appType) {
    if (appType === Setting_1.AppType.Desktop)
        return LockClientType.Desktop;
    if (appType === Setting_1.AppType.Mobile)
        return LockClientType.Mobile;
    if (appType === Setting_1.AppType.Cli)
        return LockClientType.Cli;
    throw new Error(`Invalid app type: ${appType}`);
}
function hasActiveLock(locks, currentDate, lockTtl, lockType, clientType = null, clientId = null) {
    const lock = activeLock(locks, currentDate, lockTtl, lockType, clientType, clientId);
    return !!lock;
}
// Finds if there's an active lock for this clientType and clientId and returns it.
// If clientType and clientId are not specified, returns the first active lock
// of that type instead.
function activeLock(locks, currentDate, lockTtl, lockType, clientType = null, clientId = null) {
    if (lockType === LockType.Exclusive) {
        const activeLocks = locks
            .slice()
            .filter((lock) => lockIsActive(lock, currentDate, lockTtl) && lock.type === lockType)
            .sort((a, b) => {
            if (a.updatedTime === b.updatedTime) {
                return a.clientId < b.clientId ? -1 : +1;
            }
            return a.updatedTime < b.updatedTime ? -1 : +1;
        });
        if (!activeLocks.length)
            return null;
        const lock = activeLocks[0];
        if (clientType && clientType !== lock.clientType)
            return null;
        if (clientId && clientId !== lock.clientId)
            return null;
        return lock;
    }
    else if (lockType === LockType.Sync) {
        for (const lock of locks) {
            if (lock.type !== lockType)
                continue;
            if (clientType && lock.clientType !== clientType)
                continue;
            if (clientId && lock.clientId !== clientId)
                continue;
            if (lockIsActive(lock, currentDate, lockTtl))
                return lock;
        }
        return null;
    }
    throw new Error(`Unsupported lock type: ${lockType}`);
}
function defaultAcquireLockOptions() {
    return {
        clearExistingSyncLocksFromTheSameClient: false,
        timeoutMs: 0,
    };
}
exports.defaultLockTtl = 1000 * 60 * 3;
class LockHandler {
    constructor(api, options = null) {
        this.api_ = null;
        this.refreshTimers_ = {};
        this.autoRefreshInterval_ = 1000 * 60;
        this.lockTtl_ = exports.defaultLockTtl;
        this.enabled_ = false;
        if (!options)
            options = {};
        this.api_ = api;
        if ('lockTtl' in options)
            this.lockTtl_ = options.lockTtl;
        if ('autoRefreshInterval' in options)
            this.autoRefreshInterval_ = options.autoRefreshInterval;
    }
    get enabled() {
        return this.enabled_;
    }
    set enabled(v) {
        this.enabled_ = v;
    }
    get lockTtl() {
        return this.lockTtl_;
    }
    // Should only be done for testing purposes since all clients should
    // use the same lock max age.
    set lockTtl(v) {
        this.lockTtl_ = v;
    }
    get useBuiltInLocks() {
        return this.api_.supportsLocks;
    }
    lockFilename(lock) {
        return `${[lock.type, lock.clientType, lock.clientId].join('_')}.json`;
    }
    lockTypeFromFilename(name) {
        const ext = fileExtension(name);
        if (ext !== 'json')
            return LockType.None;
        if (name.indexOf(LockType.Sync.toString()) === 0)
            return LockType.Sync;
        if (name.indexOf(LockType.Exclusive.toString()) === 0)
            return LockType.Exclusive;
        return LockType.None;
    }
    lockFilePath(lock) {
        return `${types_1.Dirnames.Locks}/${this.lockFilename(lock)}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    lockFileToObject(file) {
        return lockNameToObject(filename(file.path), file.updated_time);
    }
    async locks(lockType = null) {
        if (!this.enabled)
            return [];
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        if (this.useBuiltInLocks) {
            const locks = (await this.api_.listLocks()).items;
            return locks;
        }
        const result = await this.api_.list(types_1.Dirnames.Locks);
        if (result.hasMore)
            throw new Error('hasMore not handled'); // Shouldn't happen anyway
        const output = [];
        for (const file of result.items) {
            const type = this.lockTypeFromFilename(file.path);
            if (type === LockType.None)
                continue;
            if (lockType && type !== lockType)
                continue;
            const lock = this.lockFileToObject(file);
            output.push(lock);
        }
        return output;
    }
    async saveLock(lock) {
        if (!this.enabled)
            return;
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        await this.api_.put(this.lockFilePath(lock), JSON.stringify(lock));
    }
    // This is for testing only
    async saveLock_(lock) {
        return this.saveLock(lock);
    }
    async acquireSyncLock(clientType, clientId) {
        if (this.useBuiltInLocks)
            return this.api_.acquireLock(LockType.Sync, clientType, clientId);
        try {
            let isFirstPass = true;
            while (true) {
                const locks = await this.locks();
                const currentDate = await this.currentDate();
                const [exclusiveLock, syncLock] = await Promise.all([
                    activeLock(locks, currentDate, this.lockTtl, LockType.Exclusive),
                    activeLock(locks, currentDate, this.lockTtl, LockType.Sync, clientType, clientId),
                ]);
                if (exclusiveLock) {
                    throw new JoplinError_1.default(`Cannot acquire sync lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(exclusiveLock)}`, 'hasExclusiveLock');
                }
                if (syncLock) {
                    // Normally the second pass should happen immediately afterwards, but if for some reason
                    // (slow network, etc.) it took more than 10 seconds then refresh the lock.
                    if (isFirstPass || Date.now() - syncLock.updatedTime > 1000 * 10) {
                        await this.saveLock(syncLock);
                    }
                    return syncLock;
                }
                // Something wrong happened, which means we saved a lock but we didn't read
                // it back. Could be application error or server issue.
                if (!isFirstPass)
                    throw new Error('Cannot acquire sync lock: either the lock could be written but not read back. Or it was expired before it was read again.');
                await this.saveLock({
                    type: LockType.Sync,
                    clientType: clientType,
                    clientId: clientId,
                });
                isFirstPass = false;
            }
        }
        catch (error) {
            await this.releaseLock(LockType.Sync, clientType, clientId);
            throw error;
        }
    }
    lockToClientString(lock) {
        return `(${lock.clientType} #${lock.clientId})`;
    }
    async acquireExclusiveLock(clientType, clientId, options = null) {
        if (!this.enabled)
            return nullLock();
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        if (this.useBuiltInLocks)
            return this.api_.acquireLock(LockType.Exclusive, clientType, clientId);
        // The logic to acquire an exclusive lock, while avoiding race conditions is as follow:
        //
        // - Check if there is a lock file present
        //
        // - If there is a lock file, see if I'm the one owning it by checking that its content has my identifier.
        // - If that's the case, just write to the data file then delete the lock file.
        // - If that's not the case, just wait a second or a small random length of time and try the whole cycle again-.
        //
        // -If there is no lock file, create one with my identifier and try the whole cycle again to avoid race condition (re-check that the lock file is really mine)-.
        options = Object.assign(Object.assign({}, defaultAcquireLockOptions()), options);
        const startTime = Date.now();
        async function waitForTimeout() {
            if (!options.timeoutMs)
                return false;
            const elapsed = Date.now() - startTime;
            if (options.timeoutMs && elapsed < options.timeoutMs) {
                await time_1.default.sleep(2);
                return true;
            }
            return false;
        }
        try {
            while (true) {
                const locks = await this.locks();
                const currentDate = await this.currentDate();
                const [activeSyncLock, activeExclusiveLock] = await Promise.all([
                    activeLock(locks, currentDate, this.lockTtl, LockType.Sync),
                    activeLock(locks, currentDate, this.lockTtl, LockType.Exclusive),
                ]);
                if (activeSyncLock) {
                    if (options.clearExistingSyncLocksFromTheSameClient && activeSyncLock.clientId === clientId && activeSyncLock.clientType === clientType) {
                        await this.releaseLock(LockType.Sync, clientType, clientId);
                    }
                    else {
                        if (await waitForTimeout())
                            continue;
                        throw new JoplinError_1.default(`Cannot acquire exclusive lock because the following clients have a sync lock on the target: ${this.lockToClientString(activeSyncLock)}`, 'hasSyncLock');
                    }
                }
                if (activeExclusiveLock) {
                    if (activeExclusiveLock.clientId === clientId) {
                        // Save it again to refresh the timestamp
                        await this.saveLock(activeExclusiveLock);
                        return activeExclusiveLock;
                    }
                    else {
                        // If there's already an exclusive lock, wait for it to be released
                        if (await waitForTimeout())
                            continue;
                        throw new JoplinError_1.default(`Cannot acquire exclusive lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(activeExclusiveLock)}`, 'hasExclusiveLock');
                    }
                }
                else {
                    // If there's not already an exclusive lock, acquire one
                    // then loop again to check that we really got the lock
                    // (to prevent race conditions)
                    await this.saveLock({
                        type: LockType.Exclusive,
                        clientType: clientType,
                        clientId: clientId,
                    });
                    await time_1.default.msleep(100);
                }
            }
        }
        catch (error) {
            await this.releaseLock(LockType.Exclusive, clientType, clientId);
            throw error;
        }
    }
    autoLockRefreshHandle(lock) {
        return [lock.type, lock.clientType, lock.clientId].join('_');
    }
    async currentDate() {
        return this.api_.remoteDate();
    }
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    startAutoLockRefresh(lock, errorHandler) {
        if (!this.enabled)
            return '';
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        const handle = this.autoLockRefreshHandle(lock);
        if (this.refreshTimers_[handle]) {
            throw new Error(`There is already a timer refreshing this lock: ${handle}`);
        }
        this.refreshTimers_[handle] = {
            id: null,
            inProgress: false,
        };
        this.refreshTimers_[handle].id = shim_1.default.setInterval(async () => {
            if (this.refreshTimers_[handle].inProgress)
                return;
            const defer = () => {
                if (!this.refreshTimers_[handle])
                    return;
                this.refreshTimers_[handle].inProgress = false;
            };
            this.refreshTimers_[handle].inProgress = true;
            let error = null;
            if (!this.refreshTimers_[handle])
                return defer(); // Timeout has been cleared
            const locks = await this.locks(lock.type);
            if (!hasActiveLock(locks, await this.currentDate(), this.lockTtl, lock.type, lock.clientType, lock.clientId)) {
                // If the previous lock has expired, we shouldn't try to acquire a new one. This is because other clients might have performed
                // in the meantime operations that invalidates the current operation. For example, another client might have upgraded the
                // sync target in the meantime, so any active operation should be cancelled here. Or if the current client was upgraded
                // the sync target, another client might have synced since then, making any cached data invalid.
                // In some cases it should be safe to re-acquire a lock but adding support for this would make the algorithm more complex
                // without much benefits.
                error = new JoplinError_1.default('Lock has expired', 'lockExpired');
            }
            else {
                try {
                    await this.acquireLock(lock.type, lock.clientType, lock.clientId);
                    if (!this.refreshTimers_[handle])
                        return defer(); // Timeout has been cleared
                }
                catch (e) {
                    error = e;
                }
            }
            if (error) {
                if (this.refreshTimers_[handle]) {
                    shim_1.default.clearInterval(this.refreshTimers_[handle].id);
                    delete this.refreshTimers_[handle];
                }
                errorHandler(error);
            }
            defer();
        }, this.autoRefreshInterval_);
        return handle;
    }
    stopAutoLockRefresh(lock) {
        if (!this.enabled)
            return;
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        const handle = this.autoLockRefreshHandle(lock);
        if (!this.refreshTimers_[handle]) {
            // Should not throw an error because lock may have been cleared in startAutoLockRefresh
            // if there was an error.
            // throw new Error(`There is no such lock being auto-refreshed: ${this.lockToString(lock)}`);
            return;
        }
        shim_1.default.clearInterval(this.refreshTimers_[handle].id);
        delete this.refreshTimers_[handle];
    }
    async acquireLock(lockType, clientType, clientId, options = null) {
        if (!this.enabled)
            return nullLock();
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        options = Object.assign(Object.assign({}, defaultAcquireLockOptions()), options);
        if (lockType === LockType.Sync) {
            return this.acquireSyncLock(clientType, clientId);
        }
        else if (lockType === LockType.Exclusive) {
            return this.acquireExclusiveLock(clientType, clientId, options);
        }
        else {
            throw new Error(`Invalid lock type: ${lockType}`);
        }
    }
    async releaseLock(lockType, clientType, clientId) {
        if (!this.enabled)
            return;
        if (this.enabled)
            throw new Error('Lock handler is enabled');
        if (this.useBuiltInLocks) {
            await this.api_.releaseLock(lockType, clientType, clientId);
            return;
        }
        await this.api_.delete(this.lockFilePath({
            type: lockType,
            clientType: clientType,
            clientId: clientId,
        }));
    }
}
exports.default = LockHandler;
