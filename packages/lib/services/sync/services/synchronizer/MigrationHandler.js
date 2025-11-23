"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LockHandler_1 = require("./LockHandler");
const types_1 = require("./utils/types");
const BaseService_1 = require("../BaseService");
const _1_1 = require("./migrations/1");
const _2_1 = require("./migrations/2");
const _3_1 = require("./migrations/3");
const Setting_1 = require("../../models/Setting");
const JoplinError_1 = require("../../JoplinError");
const syncInfoUtils_1 = require("./syncInfoUtils");
const { sprintf } = require('sprintf-js');
// To add a new migration:
// - Add the migration logic in ./migrations/VERSION_NUM.js
// - Add the file to the array below.
// - Set Setting.syncVersion to VERSION_NUM in models/Setting.js
// - Add tests in synchronizer_migrationHandler
const migrations = [
    null,
    _1_1.default,
    _2_1.default,
    _3_1.default,
];
class MigrationHandler extends BaseService_1.default {
    constructor(api, db, lockHandler, clientType, clientId) {
        super();
        this.api_ = null;
        this.lockHandler_ = null;
        this.api_ = api;
        this.db_ = db;
        this.lockHandler_ = lockHandler;
        this.clientType_ = clientType;
        this.clientId_ = clientId;
    }
    async fetchSyncTargetInfo() {
        const syncTargetInfoText = await this.api_.get('info.json');
        // Returns version 0 if the sync target is empty
        let output = { version: 0 };
        if (syncTargetInfoText) {
            output = JSON.parse(syncTargetInfoText);
            if (!output.version)
                throw new Error('Missing "version" field in info.json');
        }
        else {
            const oldVersion = await this.api_.get('.sync/version.txt');
            if (oldVersion)
                output = { version: 1 };
        }
        return output;
    }
    serializeSyncTargetInfo(info) {
        return JSON.stringify(info);
    }
    async checkCanSync(remoteInfo = null) {
        remoteInfo = remoteInfo || await (0, syncInfoUtils_1.fetchSyncInfo)(this.api_);
        const supportedSyncTargetVersion = Setting_1.default.value('syncVersion');
        if (remoteInfo.version) {
            if (remoteInfo.version > supportedSyncTargetVersion) {
                throw new JoplinError_1.default(sprintf('Sync version of the target (%d) is greater than the version supported by the app (%d). Please upgrade your app.', remoteInfo.version, supportedSyncTargetVersion), 'outdatedClient');
            }
            else if (remoteInfo.version < supportedSyncTargetVersion) {
                throw new JoplinError_1.default(sprintf('Sync version of the target (%d) is lower than the version supported by the app (%d). Please upgrade the sync target.', remoteInfo.version, supportedSyncTargetVersion), 'outdatedSyncTarget');
            }
        }
    }
    async upgrade(targetVersion = 0) {
        const supportedSyncTargetVersion = Setting_1.default.value('syncVersion');
        const syncTargetInfo = await this.fetchSyncTargetInfo();
        if (syncTargetInfo.version > supportedSyncTargetVersion) {
            throw new JoplinError_1.default(sprintf('Sync version of the target (%d) is greater than the version supported by the app (%d). Please upgrade your app.', syncTargetInfo.version, supportedSyncTargetVersion), 'outdatedClient');
        }
        // if (supportedSyncTargetVersion !== migrations.length - 1) {
        // 	// Sanity check - it means a migration has been added by syncVersion has not be incremented or vice-versa,
        // 	// so abort as it can cause strange issues.
        // 	throw new JoplinError('Application error: mismatch between max supported sync version and max migration number: ' + supportedSyncTargetVersion + ' / ' + (migrations.length - 1));
        // }
        // Special case for version 1 because it didn't have the lock folder and without
        // it the lock handler will break. So we create the directory now.
        // Also if the sync target version is 0, it means it's a new one so we need the
        // lock folder first before doing anything else.
        // Temp folder is needed too to get remoteDate() call to work.
        if (syncTargetInfo.version === 0 || syncTargetInfo.version === 1) {
            this.logger().info('MigrationHandler: Sync target version is 0 or 1 - creating "locks" and "temp" directory:', syncTargetInfo);
            await this.api_.mkdir(types_1.Dirnames.Locks);
            await this.api_.mkdir(types_1.Dirnames.Temp);
        }
        this.logger().info('MigrationHandler: Acquiring exclusive lock');
        const exclusiveLock = await this.lockHandler_.acquireLock(LockHandler_1.LockType.Exclusive, this.clientType_, this.clientId_, {
            clearExistingSyncLocksFromTheSameClient: true,
            timeoutMs: 1000 * 30,
        });
        let autoLockError = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.lockHandler_.startAutoLockRefresh(exclusiveLock, (error) => {
            autoLockError = error;
        });
        this.logger().info('MigrationHandler: Acquired exclusive lock:', exclusiveLock);
        try {
            for (let newVersion = syncTargetInfo.version + 1; newVersion < migrations.length; newVersion++) {
                if (targetVersion && newVersion > targetVersion)
                    break;
                const fromVersion = newVersion - 1;
                this.logger().info(`MigrationHandler: Migrating from version ${fromVersion} to version ${newVersion}`);
                const migration = migrations[newVersion];
                if (!migration)
                    continue;
                try {
                    if (autoLockError)
                        throw autoLockError;
                    await migration(this.api_, this.db_);
                    if (autoLockError)
                        throw autoLockError;
                    // For legacy support. New migrations should set the sync
                    // target info directly as needed.
                    if ([1, 2].includes(newVersion)) {
                        await this.api_.put('info.json', this.serializeSyncTargetInfo(Object.assign(Object.assign({}, syncTargetInfo), { version: newVersion })));
                    }
                    this.logger().info(`MigrationHandler: Done migrating from version ${fromVersion} to version ${newVersion}`);
                }
                catch (error) {
                    error.message = `Could not upgrade from version ${fromVersion} to version ${newVersion}: ${error.message}`;
                    throw error;
                }
            }
        }
        finally {
            this.logger().info('MigrationHandler: Releasing exclusive lock');
            this.lockHandler_.stopAutoLockRefresh(exclusiveLock);
            await this.lockHandler_.releaseLock(LockHandler_1.LockType.Exclusive, this.clientType_, this.clientId_);
        }
    }
}
exports.default = MigrationHandler;
