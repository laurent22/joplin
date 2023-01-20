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
const BaseModel_1 = require("./BaseModel");
const LockHandler_1 = require("@joplin/lib/services/synchronizer/LockHandler");
const errors_1 = require("../utils/errors");
const uuidgen_1 = require("../utils/uuidgen");
class LockModel extends BaseModel_1.default {
    constructor() {
        super(...arguments);
        this.lockTtl_ = LockHandler_1.defaultLockTtl;
    }
    get tableName() {
        return 'locks';
    }
    uuidType() {
        return BaseModel_1.UuidType.Native;
    }
    get lockTtl() {
        return this.lockTtl_;
    }
    allLocks(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userKey = `locks::${userId}`;
            const v = yield this.models().keyValue().value(userKey);
            return v ? JSON.parse(v) : [];
        });
    }
    validate(lock) {
        return __awaiter(this, void 0, void 0, function* () {
            if (![LockHandler_1.LockType.Sync, LockHandler_1.LockType.Exclusive].includes(lock.type))
                throw new errors_1.ErrorUnprocessableEntity(`Invalid lock type: ${lock.type}`);
            if (![LockHandler_1.LockClientType.Desktop, LockHandler_1.LockClientType.Mobile, LockHandler_1.LockClientType.Cli].includes(lock.clientType))
                throw new errors_1.ErrorUnprocessableEntity(`Invalid lock client type: ${lock.clientType}`);
            if (lock.clientId.length > 64)
                throw new errors_1.ErrorUnprocessableEntity(`Invalid client ID length: ${lock.clientId}`);
            return lock;
        });
    }
    expireLocks(locks) {
        const cutOffTime = Date.now() - this.lockTtl;
        const output = [];
        for (const lock of locks) {
            if (lock.updatedTime > cutOffTime) {
                output.push(lock);
            }
        }
        return output;
    }
    acquireSyncLock(userId, clientType, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userKey = `locks::${userId}`;
            let output = null;
            yield this.models().keyValue().readThenWrite(userKey, (value) => __awaiter(this, void 0, void 0, function* () {
                let locks = value ? JSON.parse(value) : [];
                locks = this.expireLocks(locks);
                const exclusiveLock = (0, LockHandler_1.activeLock)(locks, new Date(), this.lockTtl, LockHandler_1.LockType.Exclusive);
                if (exclusiveLock) {
                    throw new errors_1.ErrorConflict(`Cannot acquire lock because there is already an exclusive lock for client: ${exclusiveLock.clientType} #${exclusiveLock.clientId}`, 'hasExclusiveLock');
                }
                const syncLock = (0, LockHandler_1.activeLock)(locks, new Date(), this.lockTtl, LockHandler_1.LockType.Sync, clientType, clientId);
                if (syncLock) {
                    output = Object.assign(Object.assign({}, syncLock), { updatedTime: Date.now() });
                    locks = locks.map(l => l.id === syncLock.id ? output : l);
                }
                else {
                    output = {
                        id: (0, uuidgen_1.default)(),
                        type: LockHandler_1.LockType.Sync,
                        clientId,
                        clientType,
                        updatedTime: Date.now(),
                    };
                    locks.push(output);
                }
                return JSON.stringify(locks);
            }));
            return output;
        });
    }
    acquireExclusiveLock(userId, clientType, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userKey = `locks::${userId}`;
            let output = null;
            yield this.models().keyValue().readThenWrite(userKey, (value) => __awaiter(this, void 0, void 0, function* () {
                let locks = value ? JSON.parse(value) : [];
                locks = this.expireLocks(locks);
                const exclusiveLock = (0, LockHandler_1.activeLock)(locks, new Date(), this.lockTtl, LockHandler_1.LockType.Exclusive);
                if (exclusiveLock) {
                    if (exclusiveLock.clientId === clientId) {
                        locks = locks.filter(l => l.id !== exclusiveLock.id);
                        output = Object.assign(Object.assign({}, exclusiveLock), { updatedTime: Date.now() });
                        locks.push(output);
                        return JSON.stringify(locks);
                    }
                    else {
                        throw new errors_1.ErrorConflict(`Cannot acquire lock because there is already an exclusive lock for client: ${exclusiveLock.clientType} #${exclusiveLock.clientId}`, 'hasExclusiveLock');
                    }
                }
                const syncLock = (0, LockHandler_1.activeLock)(locks, new Date(), this.lockTtl, LockHandler_1.LockType.Sync);
                if (syncLock) {
                    if (syncLock.clientId === clientId) {
                        locks = locks.filter(l => l.id !== syncLock.id);
                    }
                    else {
                        throw new errors_1.ErrorConflict(`Cannot acquire exclusive lock because there is an active sync lock for client: ${syncLock.clientType} #${syncLock.clientId}`, 'hasSyncLock');
                    }
                }
                output = {
                    id: (0, uuidgen_1.default)(),
                    type: LockHandler_1.LockType.Exclusive,
                    clientId,
                    clientType,
                    updatedTime: Date.now(),
                };
                locks.push(output);
                return JSON.stringify(locks);
            }));
            return output;
        });
    }
    acquireLock(userId, type, clientType, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validate({ type, clientType, clientId });
            if (type === LockHandler_1.LockType.Sync) {
                return this.acquireSyncLock(userId, clientType, clientId);
            }
            else {
                return this.acquireExclusiveLock(userId, clientType, clientId);
            }
        });
    }
    releaseLock(userId, type, clientType, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validate({ type, clientType, clientId });
            const userKey = `locks::${userId}`;
            yield this.models().keyValue().readThenWrite(userKey, (value) => __awaiter(this, void 0, void 0, function* () {
                let locks = value ? JSON.parse(value) : [];
                locks = this.expireLocks(locks);
                for (let i = locks.length - 1; i >= 0; i--) {
                    const lock = locks[i];
                    if (lock.type === type && lock.clientType === clientType && lock.clientId === clientId) {
                        locks.splice(i, 1);
                    }
                }
                return JSON.stringify(locks);
            }));
        });
    }
}
exports.default = LockModel;
//# sourceMappingURL=LockModel.js.map