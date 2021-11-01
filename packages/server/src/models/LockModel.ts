import BaseModel, { UuidType } from './BaseModel';
import { Uuid } from '../services/database/types';
import { Lock, LockType, defaultLockTtl, activeLock } from '@joplin/lib/services/synchronizer/LockHandler';
import { Value } from './KeyValueModel';
import { ErrorConflict } from '../utils/errors';
import uuidgen from '../utils/uuidgen';

export default class LockModel extends BaseModel<Lock> {

	private lockTtl_: number = defaultLockTtl;

	protected get tableName(): string {
		return 'locks';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	// TODO: validate lock when acquiring and releasing

	private get lockTtl() {
		return this.lockTtl_;
	}

	public async allLocks(userId: Uuid): Promise<Lock[]> {
		const userKey = `locks::${userId}`;
		const v = await this.models().keyValue().value<string>(userKey);
		return v ? JSON.parse(v) : [];
	}

	private async acquireSyncLock(userId: Uuid, clientType: string, clientId: string): Promise<Lock> {
		const userKey = `locks::${userId}`;
		let output: Lock = null;

		await this.models().keyValue().readThenWrite(userKey, async (value: Value) => {
			let locks: Lock[] = value ? JSON.parse(value as string) : [];

			const exclusiveLock = activeLock(locks, new Date(), this.lockTtl, LockType.Exclusive);

			if (exclusiveLock) {
				throw new ErrorConflict(`Cannot acquire lock because there is already an exclusive lock for client: ${exclusiveLock.clientType} #${exclusiveLock.clientId}`, 'hasExclusiveLock');
			}

			const syncLock = activeLock(locks, new Date(), this.lockTtl, LockType.Sync, clientType, clientId);

			if (syncLock) {
				output = {
					...syncLock,
					updatedTime: Date.now(),
				};

				locks = locks.map(l => l.id === syncLock.id ? output : l);
			} else {
				output = {
					id: uuidgen(),
					type: LockType.Sync,
					clientId,
					clientType,
					updatedTime: Date.now(),
				};

				locks.push(output);
			}

			return JSON.stringify(locks);
		});

		return output;
	}

	private async acquireExclusiveLock(userId: Uuid, clientType: string, clientId: string): Promise<Lock> {
		const userKey = `locks::${userId}`;
		let output: Lock = null;

		await this.models().keyValue().readThenWrite(userKey, async (value: Value) => {
			let locks: Lock[] = value ? JSON.parse(value as string) : [];

			const exclusiveLock = activeLock(locks, new Date(), this.lockTtl, LockType.Exclusive);

			if (exclusiveLock) {
				if (exclusiveLock.clientId === clientId) {
					locks = locks.filter(l => l.id !== exclusiveLock.id);
					output = {
						...exclusiveLock,
						updatedTime: Date.now(),
					};

					locks.push(output);

					return JSON.stringify(locks);
				} else {
					throw new ErrorConflict(`Cannot acquire lock because there is already an exclusive lock for client: ${exclusiveLock.clientType} #${exclusiveLock.clientId}`, 'hasExclusiveLock');
				}
			}

			const syncLock = activeLock(locks, new Date(), this.lockTtl, LockType.Sync);

			if (syncLock) {
				if (syncLock.clientId === clientId) {
					locks = locks.filter(l => l.id !== syncLock.id);
				} else {
					throw new ErrorConflict(`Cannot acquire exclusive lock because there is an active sync lock for client: ${syncLock.clientType} #${syncLock.clientId}`, 'hasSyncLock');
				}
			}

			output = {
				id: uuidgen(),
				type: LockType.Exclusive,
				clientId,
				clientType,
				updatedTime: Date.now(),
			};

			locks.push(output);

			return JSON.stringify(locks);
		});

		return output;
	}

	public async acquireLock(userId: Uuid, type: LockType, clientType: string, clientId: string): Promise<Lock> {
		if (type === LockType.Sync) {
			return this.acquireSyncLock(userId, clientType, clientId);
		} else {
			return this.acquireExclusiveLock(userId, clientType, clientId);
		}
	}

	public async releaseLock(userId: Uuid, lockType: LockType, clientType: string, clientId: string) {
		const userKey = `locks::${userId}`;

		await this.models().keyValue().readThenWrite(userKey, async (value: Value) => {
			const locks: Lock[] = value ? JSON.parse(value as string) : [];

			for (let i = locks.length - 1; i >= 0; i--) {
				const lock = locks[i];
				if (lock.type === lockType && lock.clientType === clientType && lock.clientId === clientId) {
					locks.splice(i, 1);
				}
			}

			return JSON.stringify(locks);
		});
	}

}
