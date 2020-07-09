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

const exclusiveFilename = 'exclusive.json';

export default class LockHandler {

	private api_:any = null;
	private lockDirPath_:any = null;

	constructor(api:any, lockDirPath:string) {
		this.api_ = api;
		this.lockDirPath_ = lockDirPath;
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
		return `${this.lockDirPath_}/${this.lockFilename(lock)}`;
	}

	private exclusiveFilePath():string {
		return `${this.lockDirPath_}/${exclusiveFilename}`;
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
		const result = await this.api_.list(this.lockDirPath_);
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

	private async saveLock(lock:Lock) {
		await this.api_.put(this.lockFilePath(lock), JSON.stringify(lock));
	}

	private async acquireSyncLock(clientType:string, clientId:string) {
		const exclusiveLock = await this.exclusiveLock();

		if (exclusiveLock) {
			throw new JoplinError(`Cannot acquire sync lock because "${exclusiveLock.clientType}" client (ID ${exclusiveLock.clientId}) has an exclusive lock on the sync target.`, 'hasExclusiveLock');
		}

		await this.saveLock({
			type: LockType.Sync,
			clientType: clientType,
			clientId: clientId,
		});
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

		while (true) {
			// const syncLocks = await this.syncLocks();

			const exclusiveLock = await this.exclusiveLock();
			const isOwnExclusiveLock = exclusiveLock.clientId === clientId;

			// TODO: check for existince of sync locks

			if (exclusiveLock) {
				if (isOwnExclusiveLock) {
					// Save it again to refresh the timestamp
					await this.saveLock(exclusiveLock);
					return;
				} else {
					// If there's already an exclusive lock, wait for it to be released
					const elapsed = Date.now() - startTime;
					if (timeoutMs && elapsed < timeoutMs) {
						await time.sleep(2);
						continue;
					}
					throw new JoplinError(`Cannot acquire exclusive lock because "${exclusiveLock.clientType}" client (ID ${exclusiveLock.clientId}) has an exclusive lock on the sync target.`, 'hasExclusiveLock');
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
