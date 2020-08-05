import { Dirnames } from './utils/types';
const JoplinError = require('lib/JoplinError');
const { time } = require('lib/time-utils');
const { fileExtension, filename } = require('lib/path-utils.js');

export enum LockType {
	None = '',
	Sync = 'sync',
	Exclusive = 'exclusive',
}

export interface Lock {
	type: LockType,
	clientType: string,
	clientId: string,
	updatedTime?: number,
}

interface RefreshTimer {
	id: any,
	inProgress: boolean
}

interface RefreshTimers {
	[key:string]: RefreshTimer;
}

export interface LockHandlerOptions {
	autoRefreshInterval?: number,
	lockTtl?: number,
}

export default class LockHandler {

	private api_:any = null;
	private refreshTimers_:RefreshTimers = {};
	private autoRefreshInterval_:number = 1000 * 60;
	private lockTtl_:number = 1000 * 60 * 3;

	constructor(api:any, options:LockHandlerOptions = null) {
		if (!options) options = {};

		this.api_ = api;
		if ('lockTtl' in options) this.lockTtl_ = options.lockTtl;
		if ('autoRefreshInterval' in options) this.autoRefreshInterval_ = options.autoRefreshInterval;
	}

	public get lockTtl():number {
		return this.lockTtl_;
	}

	// Should only be done for testing purposes since all clients should
	// use the same lock max age.
	public set lockTtl(v:number) {
		this.lockTtl_ = v;
	}

	private lockFilename(lock:Lock) {
		return `${[lock.type, lock.clientType, lock.clientId].join('_')}.json`;
	}

	private lockTypeFromFilename(name:string):LockType {
		const ext = fileExtension(name);
		if (ext !== 'json') return LockType.None;
		if (name.indexOf(LockType.Sync) === 0) return LockType.Sync;
		if (name.indexOf(LockType.Exclusive) === 0) return LockType.Exclusive;
		return LockType.None;
	}

	private lockFilePath(lock:Lock) {
		return `${Dirnames.Locks}/${this.lockFilename(lock)}`;
	}

	private lockFileToObject(file:any):Lock {
		const p = filename(file.path).split('_');

		return {
			type: p[0],
			clientType: p[1],
			clientId: p[2],
			updatedTime: file.updated_time,
		};
	}

	async locks(lockType:LockType = null):Promise<Lock[]> {
		const result = await this.api_.list(Dirnames.Locks);
		if (result.hasMore) throw new Error('hasMore not handled'); // Shouldn't happen anyway

		const output = [];
		for (const file of result.items) {
			const type = this.lockTypeFromFilename(file.path);
			if (type === LockType.None) continue;
			if (lockType && type !== lockType) continue;
			const lock = this.lockFileToObject(file);
			output.push(lock);
		}

		return output;
	}

	private lockIsActive(lock:Lock):boolean {
		return Date.now() - lock.updatedTime < this.lockTtl;
	}

	async hasActiveLock(lockType:LockType, clientType:string = null, clientId:string = null) {
		const lock = await this.activeLock(lockType, clientType, clientId);
		return !!lock;
	}

	// Finds if there's an active lock for this clientType and clientId and returns it.
	// If clientType and clientId are not specified, returns the first active lock
	// of that type instead.
	async activeLock(lockType:LockType, clientType:string = null, clientId:string = null) {
		const locks = await this.locks(lockType);

		if (lockType === LockType.Exclusive) {
			const activeLocks = locks
				.slice()
				.filter((lock:Lock) => this.lockIsActive(lock))
				.sort((a:Lock, b:Lock) => {
					if (a.updatedTime === b.updatedTime) {
						return a.clientId < b.clientId ? -1 : +1;
					}
					return a.updatedTime < b.updatedTime ? -1 : +1;
				});

			if (!activeLocks.length) return null;
			const activeLock = activeLocks[0];

			if (clientType && clientType !== activeLock.clientType) return null;
			if (clientId && clientId !== activeLock.clientId) return null;
			return activeLock;
		} else if (lockType === LockType.Sync) {
			for (const lock of locks) {
				if (clientType && lock.clientType !== clientType) continue;
				if (clientId && lock.clientId !== clientId) continue;
				if (this.lockIsActive(lock)) return lock;
			}
			return null;
		}

		throw new Error(`Unsupported lock type: ${lockType}`);
	}

	private async saveLock(lock:Lock) {
		await this.api_.put(this.lockFilePath(lock), JSON.stringify(lock));
	}

	// This is for testing only
	public async saveLock_(lock:Lock) {
		return this.saveLock(lock);
	}

	private async acquireSyncLock(clientType:string, clientId:string):Promise<Lock> {
		try {
			let isFirstPass = true;
			while (true) {
				const [exclusiveLock, syncLock] = await Promise.all([
					this.activeLock(LockType.Exclusive),
					this.activeLock(LockType.Sync, clientType, clientId),
				]);

				if (exclusiveLock) {
					throw new JoplinError(`Cannot acquire sync lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(exclusiveLock)}`, 'hasExclusiveLock');
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
				if (!isFirstPass) throw new Error('Cannot acquire sync lock: either the lock could be written but not read back. Or it was expired before it was read again.');

				await this.saveLock({
					type: LockType.Sync,
					clientType: clientType,
					clientId: clientId,
				});

				isFirstPass = false;
			}
		} catch (error) {
			await this.releaseLock(LockType.Sync, clientType, clientId);
			throw error;
		}
	}

	private lockToClientString(lock:Lock):string {
		return `(${lock.clientType} #${lock.clientId})`;
	}

	private async acquireExclusiveLock(clientType:string, clientId:string, timeoutMs:number = 0):Promise<Lock> {
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

		async function waitForTimeout() {
			if (!timeoutMs) return false;

			const elapsed = Date.now() - startTime;
			if (timeoutMs && elapsed < timeoutMs) {
				await time.sleep(2);
				return true;
			}
			return false;
		}

		try {
			while (true) {
				const [activeSyncLock, activeExclusiveLock] = await Promise.all([
					this.activeLock(LockType.Sync),
					this.activeLock(LockType.Exclusive),
				]);

				if (activeSyncLock) {
					if (await waitForTimeout()) continue;
					throw new JoplinError(`Cannot acquire exclusive lock because the following clients have a sync lock on the target: ${this.lockToClientString(activeSyncLock)}`, 'hasSyncLock');
				}

				if (activeExclusiveLock) {
					if (activeExclusiveLock.clientId === clientId) {
						// Save it again to refresh the timestamp
						await this.saveLock(activeExclusiveLock);
						return activeExclusiveLock;
					} else {
						// If there's already an exclusive lock, wait for it to be released
						if (await waitForTimeout()) continue;
						throw new JoplinError(`Cannot acquire exclusive lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(activeExclusiveLock)}`, 'hasExclusiveLock');
					}
				} else {
					// If there's not already an exclusive lock, acquire one
					// then loop again to check that we really got the lock
					// (to prevent race conditions)
					await this.saveLock({
						type: LockType.Exclusive,
						clientType: clientType,
						clientId: clientId,
					});

					await time.msleep(100);
				}
			}
		} catch (error) {
			await this.releaseLock(LockType.Exclusive, clientType, clientId);
			throw error;
		}
	}

	private autoLockRefreshHandle(lock:Lock) {
		return [lock.type, lock.clientType, lock.clientId].join('_');
	}

	startAutoLockRefresh(lock:Lock, errorHandler:Function):string {
		const handle = this.autoLockRefreshHandle(lock);
		if (this.refreshTimers_[handle]) {
			throw new Error(`There is already a timer refreshing this lock: ${handle}`);
		}

		this.refreshTimers_[handle] = {
			id: null,
			inProgress: false,
		};

		this.refreshTimers_[handle].id = setInterval(async () => {
			if (this.refreshTimers_[handle].inProgress) return;

			const defer = () => {
				if (!this.refreshTimers_[handle]) return;
				this.refreshTimers_[handle].inProgress = false;
			};

			this.refreshTimers_[handle].inProgress = true;

			let error = null;
			const hasActiveLock = await this.hasActiveLock(lock.type, lock.clientType, lock.clientId);
			if (!this.refreshTimers_[handle]) return defer(); // Timeout has been cleared

			if (!hasActiveLock) {
				error = new JoplinError('Lock has expired', 'lockExpired');
			} else {
				try {
					await this.acquireLock(lock.type, lock.clientType, lock.clientId);
					if (!this.refreshTimers_[handle]) return defer(); // Timeout has been cleared
				} catch (e) {
					error = e;
				}
			}

			if (error) {
				if (this.refreshTimers_[handle]) {
					clearInterval(this.refreshTimers_[handle].id);
					delete this.refreshTimers_[handle];
				}
				errorHandler(error);
			}

			defer();
		}, this.autoRefreshInterval_);

		return handle;
	}

	stopAutoLockRefresh(lock:Lock) {
		const handle = this.autoLockRefreshHandle(lock);
		if (!this.refreshTimers_[handle]) {
			// Should not throw an error because lock may have been cleared in startAutoLockRefresh
			// if there was an error.
			// throw new Error(`There is no such lock being auto-refreshed: ${this.lockToString(lock)}`);
			return;
		}

		clearInterval(this.refreshTimers_[handle].id);
		delete this.refreshTimers_[handle];
	}

	async acquireLock(lockType:LockType, clientType:string, clientId:string, timeoutMs:number = 0):Promise<Lock> {
		if (lockType === LockType.Sync) {
			return this.acquireSyncLock(clientType, clientId);
		} else if (lockType === LockType.Exclusive) {
			return this.acquireExclusiveLock(clientType, clientId, timeoutMs);
		} else {
			throw new Error(`Invalid lock type: ${lockType}`);
		}
	}

	async releaseLock(lockType:LockType, clientType:string, clientId:string) {
		await this.api_.delete(this.lockFilePath({
			type: lockType,
			clientType: clientType,
			clientId: clientId,
		}));
	}

}
