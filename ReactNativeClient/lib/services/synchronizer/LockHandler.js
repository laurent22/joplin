'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const JoplinError = require('lib/JoplinError');
const { time } = require('lib/time-utils');
const { fileExtension, filename } = require('lib/path-utils.js');
let LockType;
(function(LockType) {
	LockType['None'] = '';
	LockType['Sync'] = 'sync';
	LockType['Exclusive'] = 'exclusive';
})(LockType = exports.LockType || (exports.LockType = {}));
const exclusiveFilename = 'exclusive.json';
class LockHandler {
	constructor(api, lockDirPath) {
		this.api_ = null;
		this.lockDirPath_ = null;
		this.syncLockMaxAge_ = 1000 * 60 * 3;
		this.api_ = api;
		this.lockDirPath_ = lockDirPath;
	}
	get syncLockMaxAge() {
		return this.syncLockMaxAge_;
	}
	// Should only be done for testing purposes since all clients should
	// use the same lock max age.
	set syncLockMaxAge(v) {
		this.syncLockMaxAge_ = v;
	}
	lockFilename(lock) {
		if (lock.type === LockType.Exclusive) {
			return exclusiveFilename;
		} else {
			return `${[lock.type, lock.clientType, lock.clientId].join('_')}.json`;
		}
	}
	lockTypeFromFilename(name) {
		if (name === exclusiveFilename) { return LockType.Exclusive; }
		return LockType.Sync;
	}
	lockFilePath(lock) {
		return `${this.lockDirPath_}/${this.lockFilename(lock)}`;
	}
	exclusiveFilePath() {
		return `${this.lockDirPath_}/${exclusiveFilename}`;
	}
	syncLockFileToObject(file) {
		const p = filename(file.path).split('_');
		return {
			type: p[0],
			clientType: p[1],
			clientId: p[2],
			updatedTime: file.updated_time,
		};
	}
	syncLocks() {
		return __awaiter(this, void 0, void 0, function* () {
			const result = yield this.api_.list(this.lockDirPath_);
			if (result.hasMore) { throw new Error('hasMore not handled'); } // Shouldn't happen anyway
			const output = [];
			for (const file of result.items) {
				const ext = fileExtension(file.path);
				if (ext !== 'json') { continue; }
				const type = this.lockTypeFromFilename(file.path);
				if (type !== LockType.Sync) { continue; }
				const lock = this.syncLockFileToObject(file);
				output.push(lock);
			}
			return output;
		});
	}
	exclusiveLock() {
		return __awaiter(this, void 0, void 0, function* () {
			const stat = yield this.api_.stat(this.exclusiveFilePath());
			if (!stat) { return null; }
			const contentText = yield this.api_.get(this.exclusiveFilePath());
			if (!contentText) { return null; } // race condition
			const lock = JSON.parse(contentText);
			lock.updatedTime = stat.updated_time;
			return lock;
		});
	}
	lockIsActive(lock) {
		return Date.now() - lock.updatedTime < this.syncLockMaxAge;
	}
	hasActiveExclusiveLock() {
		return __awaiter(this, void 0, void 0, function* () {
			const lock = yield this.exclusiveLock();
			return !!lock && this.lockIsActive(lock);
		});
	}
	hasActiveSyncLock(clientType, clientId) {
		return __awaiter(this, void 0, void 0, function* () {
			const locks = yield this.syncLocks();
			for (const lock of locks) {
				if (lock.clientType === clientType && lock.clientId === clientId && this.lockIsActive(lock)) { return true; }
			}
			return false;
		});
	}
	saveLock(lock) {
		return __awaiter(this, void 0, void 0, function* () {
			yield this.api_.put(this.lockFilePath(lock), JSON.stringify(lock));
		});
	}
	acquireSyncLock(clientType, clientId) {
		return __awaiter(this, void 0, void 0, function* () {
			const exclusiveLock = yield this.exclusiveLock();
			if (exclusiveLock) {
				throw new JoplinError(`Cannot acquire sync lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(exclusiveLock)}`, 'hasExclusiveLock');
			}
			yield this.saveLock({
				type: LockType.Sync,
				clientType: clientType,
				clientId: clientId,
			});
		});
	}
	lockToClientString(lock) {
		return `(${lock.clientType} #${lock.clientId})`;
	}
	acquireExclusiveLock(clientType, clientId, timeoutMs = 0) {
		return __awaiter(this, void 0, void 0, function* () {
			// The logic to acquire an exclusive lock, while avoiding race conditions is as follow:
			//
			// - Check if there is a lock file present
			//
			// - If there is a lock file, see if I'm the one owning it by checking that its content has my identifier.
			// - If that's the case, just write to the data file then delete the lock file.
			// - If that's not the case, just wait a second or a small random length of time and try the whole cycle again-.
			//
			// -If there is no lock file, create one with my identifier and try the whole cycle again to avoid race condition (re-check that the lock file is really mine)-.
			const startTime = Date.now();
			function waitForTimeout() {
				return __awaiter(this, void 0, void 0, function* () {
					if (!timeoutMs) { return false; }
					const elapsed = Date.now() - startTime;
					if (timeoutMs && elapsed < timeoutMs) {
						yield time.sleep(2);
						return true;
					}
					return false;
				});
			}
			while (true) {
				const syncLocks = yield this.syncLocks();
				const activeSyncLocks = syncLocks.filter(lock => this.lockIsActive(lock));
				if (activeSyncLocks.length) {
					if (yield waitForTimeout()) { continue; }
					const lockString = activeSyncLocks.map(l => this.lockToClientString(l)).join(', ');
					throw new JoplinError(`Cannot acquire exclusive lock because the following clients have a sync lock on the target: ${lockString}`, 'hasSyncLock');
				}
				const exclusiveLock = yield this.exclusiveLock();
				if (exclusiveLock) {
					if (exclusiveLock.clientId === clientId) {
						// Save it again to refresh the timestamp
						yield this.saveLock(exclusiveLock);
						return;
					} else {
						// If there's already an exclusive lock, wait for it to be released
						if (yield waitForTimeout()) { continue; }
						throw new JoplinError(`Cannot acquire exclusive lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(exclusiveLock)}`, 'hasExclusiveLock');
					}
				} else {
					// If there's not already an exclusive lock, acquire one
					// then loop again to check that we really got the lock
					// (to prevent race conditions)
					yield this.saveLock({
						type: LockType.Exclusive,
						clientType: clientType,
						clientId: clientId,
					});
				}
			}
		});
	}
	acquireLock(lockType, clientType, clientId, timeoutMs = 0) {
		return __awaiter(this, void 0, void 0, function* () {
			if (lockType === LockType.Sync) {
				yield this.acquireSyncLock(clientType, clientId);
			} else if (lockType === LockType.Exclusive) {
				yield this.acquireExclusiveLock(clientType, clientId, timeoutMs);
			} else {
				throw new Error(`Invalid lock type: ${lockType}`);
			}
		});
	}
	releaseLock(lockType, clientType, clientId) {
		return __awaiter(this, void 0, void 0, function* () {
			yield this.api_.delete(this.lockFilePath({
				type: lockType,
				clientType: clientType,
				clientId: clientId,
			}));
		});
	}
}
exports.default = LockHandler;
// # sourceMappingURL=LockHandler.js.map
