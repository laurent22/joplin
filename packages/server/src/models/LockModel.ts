import BaseModel, { UuidType } from './BaseModel';
import { Uuid } from '../services/database/types';
import { LockType, Lock, LockClientType, defaultLockTtl, activeLock } from '@joplin/lib/services/synchronizer/LockHandler';
import { Value } from './KeyValueModel';
import { ErrorConflict, ErrorUnprocessableEntity, ErrorCode } from '../utils/errors';
import uuidgen from '../utils/uuidgen';

export default class LockModel extends BaseModel<Lock> {

	private lockTtl_: number = defaultLockTtl;

	protected get tableName(): string {
		return 'locks';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	public get lockTtl() {
		return this.lockTtl_;
	}

	public async allLocks(userId: Uuid): Promise<Lock[]> {
		const userKey = `locks::${userId}`;
		const v = await this.models().keyValue().value<string>(userKey);
		return v ? JSON.parse(v) : [];
	}

	protected async validate(lock: Lock): Promise<Lock> {
		if (![LockType.Sync, LockType.Exclusive].includes(lock.type)) throw new ErrorUnprocessableEntity(`Invalid lock type: ${lock.type}`);
		if (![LockClientType.Desktop, LockClientType.Mobile, LockClientType.Cli].includes(lock.clientType)) throw new ErrorUnprocessableEntity(`Invalid lock client type: ${lock.clientType}`);
		if (lock.clientId.length > 64) throw new ErrorUnprocessableEntity(`Invalid client ID length: ${lock.clientId}`);
		return lock;
	}

	private expireLocks(locks: Lock[]): Lock[] {
		const cutOffTime = Date.now() - this.lockTtl;

		const output: Lock[] = [];

		for (const lock of locks) {
			if (lock.updatedTime > cutOffTime) {
				output.push(lock);
			}
		}

		return output;
	}

	private async acquireSyncLock(userId: Uuid, clientType: LockClientType, clientId: string): Promise<Lock> {
		const userKey = `locks::${userId}`;
		let output: Lock = null;

		await this.models().keyValue().readThenWrite(userKey, async (value: Value) => {
			let locks: Lock[] = value ? JSON.parse(value as string) : [];
			locks = this.expireLocks(locks);

			const exclusiveLock = activeLock(locks, new Date(), this.lockTtl, LockType.Exclusive);

			if (exclusiveLock) {
				throw new ErrorConflict(`Cannot acquire lock because there is already an exclusive lock for client: ${exclusiveLock.clientType} #${exclusiveLock.clientId}`, ErrorCode.HasExclusiveSyncLock);
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

	private async acquireExclusiveLock(userId: Uuid, clientType: LockClientType, clientId: string): Promise<Lock> {
		const userKey = `locks::${userId}`;
		let output: Lock = null;

		await this.models().keyValue().readThenWrite(userKey, async (value: Value) => {
			let locks: Lock[] = value ? JSON.parse(value as string) : [];
			locks = this.expireLocks(locks);

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
					throw new ErrorConflict(`Cannot acquire lock because there is already an exclusive lock for client: ${exclusiveLock.clientType} #${exclusiveLock.clientId}`, ErrorCode.HasExclusiveSyncLock);
				}
			}

			const syncLock = activeLock(locks, new Date(), this.lockTtl, LockType.Sync);

			if (syncLock) {
				if (syncLock.clientId === clientId) {
					locks = locks.filter(l => l.id !== syncLock.id);
				} else {
					throw new ErrorConflict(`Cannot acquire exclusive lock because there is an active sync lock for client: ${syncLock.clientType} #${syncLock.clientId}`, ErrorCode.HasSyncLock);
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

	public async acquireLock(userId: Uuid, type: LockType, clientType: LockClientType, clientId: string): Promise<Lock> {
		await this.validate({ type, clientType, clientId });

		if (type === LockType.Sync) {
			return this.acquireSyncLock(userId, clientType, clientId);
		} else {
			return this.acquireExclusiveLock(userId, clientType, clientId);
		}
	}

	public async releaseLock(userId: Uuid, type: LockType, clientType: LockClientType, clientId: string) {
		await this.validate({ type, clientType, clientId });

		const userKey = `locks::${userId}`;

		await this.models().keyValue().readThenWrite(userKey, async (value: Value) => {
			let locks: Lock[] = value ? JSON.parse(value as string) : [];
			locks = this.expireLocks(locks);

			for (let i = locks.length - 1; i >= 0; i--) {
				const lock = locks[i];
				if (lock.type === type && lock.clientType === clientType && lock.clientId === clientId) {
					locks.splice(i, 1);
				}
			}

			return JSON.stringify(locks);
		});
	}

}
