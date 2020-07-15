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

interface RefreshTimers {
	[key:string]: any;
}

const exclusiveFilename = 'exclusive.json';

export default class LockHandler {

	private api_:any = null;
	private refreshTimers_:RefreshTimers = {};
	private refreshInterval_:number = 1000 * 60;
	private syncLockTtl_:number = 1000 * 60 * 3;

	constructor(api:any) {
		this.api_ = api;
	}

	public get syncLockMaxAge():number {
		return this.syncLockTtl_;
	}

	// Should only be done for testing purposes since all clients should
	// use the same lock max age.
	public set syncLockMaxAge(v:number) {
		this.syncLockTtl_ = v;
	}

	private lockFilename(lock:Lock) {
		if (lock.type === LockType.Exclusive) {
			return exclusiveFilename;
		} else {
			return `${[lock.type, lock.clientType, lock.clientId].join('_')}.json`;
		}
	}

	private lockTypeFromFilename(name:string):LockType {
		if (name === exclusiveFilename) return LockType.Exclusive;
		return LockType.Sync;
	}

	private lockFilePath(lock:Lock) {
		return `${Dirnames.Locks}/${this.lockFilename(lock)}`;
	}

	private exclusiveFilePath():string {
		return `${Dirnames.Locks}/${exclusiveFilename}`;
	}

	private syncLockFileToObject(file:any):Lock {
		const p = filename(file.path).split('_');

		return {
			type: p[0],
			clientType: p[1],
			clientId: p[2],
			updatedTime: file.updated_time,
		};
	}

	async syncLocks():Promise<Lock[]> {
		const result = await this.api_.list(Dirnames.Locks);
		if (result.hasMore) throw new Error('hasMore not handled'); // Shouldn't happen anyway

		const output = [];
		for (const file of result.items) {
			const ext = fileExtension(file.path);
			if (ext !== 'json') continue;

			const type = this.lockTypeFromFilename(file.path);
			if (type !== LockType.Sync) continue;

			const lock = this.syncLockFileToObject(file);
			output.push(lock);
		}

		return output;
	}

	private async exclusiveLock():Promise<Lock> {
		const stat = await this.api_.stat(this.exclusiveFilePath());
		if (!stat) return null;

		const contentText = await this.api_.get(this.exclusiveFilePath());
		if (!contentText) return null; // race condition

		const lock:Lock = JSON.parse(contentText) as Lock;
		lock.updatedTime = stat.updated_time;
		return lock;
	}

	private lockIsActive(lock:Lock):boolean {
		return Date.now() - lock.updatedTime < this.syncLockMaxAge;
	}

	async hasActiveExclusiveLock():Promise<boolean> {
		const lock = await this.exclusiveLock();
		return !!lock && this.lockIsActive(lock);
	}

	async hasActiveLock(lockType:LockType, clientType:string, clientId:string) {
		if (lockType === LockType.Exclusive) return this.hasActiveExclusiveLock();
		if (lockType === LockType.Sync) return this.hasActiveSyncLock(clientType, clientId);
		throw new Error(`Invalid lock type: ${lockType}`);
	}

	private async activeSyncLock(clientType:string, clientId:string) {
		const locks = await this.syncLocks();
		for (const lock of locks) {
			if (lock.clientType === clientType && lock.clientId === clientId && this.lockIsActive(lock)) return lock;
		}
		return null;
	}

	async hasActiveSyncLock(clientType:string, clientId:string) {
		const lock = await this.activeSyncLock(clientType, clientId);
		return !!lock;
	}

	private async saveLock(lock:Lock) {
		await this.api_.put(this.lockFilePath(lock), JSON.stringify(lock));
	}

	// TODO: add function to refresh a sync lock
	//       Fails if couldn't refresh within Y seconds
	//       Test function
	// TODO: wrap exclusive lock logic in try/catch block
	// and release lock if something fail.

	private async acquireSyncLock(clientType:string, clientId:string) {
		try {
			while (true) {
				const [exclusiveLock, syncLock] = await Promise.all([
					this.exclusiveLock(),
					this.activeSyncLock(clientType, clientId),
				]);

				if (exclusiveLock) {
					throw new JoplinError(`Cannot acquire sync lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(exclusiveLock)}`, 'hasExclusiveLock');
				}

				if (syncLock) {
					// Normally the second pass should happen immediately afterwards, but if for some reason
					// (slow network, etc.) it took more than 10 seconds then refresh the lock.
					if (Date.now() - syncLock.updatedTime > 1000 * 10) {
						await this.saveLock(syncLock);
					}
					return;
				}

				await this.saveLock({
					type: LockType.Sync,
					clientType: clientType,
					clientId: clientId,
				});
			}
		} catch (error) {
			await this.releaseLock(LockType.Sync, clientType, clientId);
			throw error;
		}
	}

	private lockToClientString(lock:Lock):string {
		return `(${lock.clientType} #${lock.clientId})`;
	}

	private async acquireExclusiveLock(clientType:string, clientId:string, timeoutMs:number = 0) {
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

		while (true) {
			const syncLocks = await this.syncLocks();
			const activeSyncLocks = syncLocks.filter(lock => this.lockIsActive(lock));

			if (activeSyncLocks.length) {
				if (await waitForTimeout()) continue;
				const lockString = activeSyncLocks.map(l => this.lockToClientString(l)).join(', ');
				throw new JoplinError(`Cannot acquire exclusive lock because the following clients have a sync lock on the target: ${lockString}`, 'hasSyncLock');
			}

			const exclusiveLock = await this.exclusiveLock();

			if (exclusiveLock) {
				if (exclusiveLock.clientId === clientId) {
					// Save it again to refresh the timestamp
					await this.saveLock(exclusiveLock);
					return;
				} else {
					// If there's already an exclusive lock, wait for it to be released
					if (await waitForTimeout()) continue;
					throw new JoplinError(`Cannot acquire exclusive lock because the following client has an exclusive lock on the sync target: ${this.lockToClientString(exclusiveLock)}`, 'hasExclusiveLock');
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
			}
		}
	}

	startAutoLockRefresh(lockType:LockType, clientType:string, clientId:string, errorHandler:Function):string {
		const handle = [lockType, clientType, clientId].join('_');
		if (this.refreshTimers_[handle]) {
			throw new Error(`There is already a timer refreshing this lock: ${handle}`);
		}

		this.refreshTimers_[handle] = setTimeout(async () => {
			let error = null;
			const hasActiveLock = await this.hasActiveLock(lockType, clientType, clientId);
			if (!this.refreshTimers_[handle]) return; // Timeout has been cleared

			if (!hasActiveLock) {
				error = new JoplinError('Lock has expired', 'lockExpired');
			} else {
				try {
					await this.acquireLock(lockType, clientType, clientId);
					if (!this.refreshTimers_[handle]) return; // Timeout has been cleared
				} catch (e) {
					error = e;
				}
			}

			if (error) {
				clearInterval(this.refreshTimers_[handle]);
				delete this.refreshTimers_[handle];
				errorHandler(error);
			}
		}, this.refreshInterval_);

		return handle;
	}

	stopAutoLockRefresh(autoLockRefreshHandle:string) {
		if (!this.refreshTimers_[autoLockRefreshHandle]) {
			throw new Error(`There is no lock being auto-refreshed with this handle: ${autoLockRefreshHandle}`);
		}

		clearInterval(this.refreshTimers_[autoLockRefreshHandle]);
		delete this.refreshTimers_[autoLockRefreshHandle];
	}

	async acquireLock(lockType:LockType, clientType:string, clientId:string, timeoutMs:number = 0) {
		if (lockType === LockType.Sync) {
			await this.acquireSyncLock(clientType, clientId);
		} else if (lockType === LockType.Exclusive) {
			await this.acquireExclusiveLock(clientType, clientId, timeoutMs);
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
