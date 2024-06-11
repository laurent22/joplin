import LockHandler, { LockType, LockHandlerOptions, Lock, activeLock, LockClientType } from '../../services/synchronizer/LockHandler';
import { isNetworkSyncTarget, fileApi, setupDatabaseAndSynchronizer, synchronizer, switchClient, msleep, expectThrow, expectNotThrow } from '../../testing/test-utils';

// For tests with memory of file system we can use low intervals to make the tests faster.
// However if we use such low values with network sync targets, some calls might randomly fail with
// ECONNRESET and similar errors (Dropbox or OneDrive migth also throttle). Also we can't use a
// low lock TTL value because the lock might expire between the time it's written and the time it's checked.
// For that reason we add this multiplier for non-memory sync targets.
const timeoutMultiplier = isNetworkSyncTarget() ? 100 : 1;

let lockHandler_: LockHandler = null;

function newLockHandler(options: LockHandlerOptions = null): LockHandler {
	return new LockHandler(fileApi(), options);
}

function lockHandler(): LockHandler {
	if (lockHandler_) return lockHandler_;
	lockHandler_ = new LockHandler(fileApi());
	return lockHandler_;
}

describe('synchronizer_LockHandler', () => {

	beforeEach(async () => {
		// logger.setLevel(Logger.LEVEL_WARN);
		lockHandler_ = null;
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		await synchronizer().start(); // Need to sync once to setup the sync target and allow locks to work
		// logger.setLevel(Logger.LEVEL_DEBUG);
	});

	it('should acquire and release a sync lock', (async () => {
		await lockHandler().acquireLock(LockType.Sync, LockClientType.Mobile, '123456');
		const locks = await lockHandler().locks(LockType.Sync);
		expect(locks.length).toBe(1);
		expect(locks[0].type).toBe(LockType.Sync);
		expect(locks[0].clientId).toBe('123456');
		expect(locks[0].clientType).toBe(LockClientType.Mobile);

		await lockHandler().releaseLock(LockType.Sync, LockClientType.Mobile, '123456');
		expect((await lockHandler().locks(LockType.Sync)).length).toBe(0);
	}));

	it('should not use files that are not locks', (async () => {
		if (lockHandler().useBuiltInLocks) return; // Doesn't make sense with built-in locks

		// Note: desktop.ini is blocked by Dropbox
		await fileApi().put('locks/desktop.test.ini', 'a');
		await fileApi().put('locks/exclusive.json', 'a');
		await fileApi().put('locks/garbage.json', 'a');
		await fileApi().put('locks/1_2_72c4d1b7253a4475bfb2f977117d26ed.json', 'a');

		// Check that it doesn't cause an error if it fetches an old style lock
		await fileApi().put('locks/sync_desktop_82c4d1b7253a4475bfb2f977117d26ed.json', 'a');

		const locks = await lockHandler().locks(LockType.Sync);
		expect(locks.length).toBe(1);
		expect(locks[0].type).toBe(LockType.Sync);
		expect(locks[0].clientType).toBe(LockClientType.Mobile);
		expect(locks[0].clientId).toBe('72c4d1b7253a4475bfb2f977117d26ed');
	}));

	it('should allow multiple sync locks', (async () => {
		await lockHandler().acquireLock(LockType.Sync, LockClientType.Mobile, '111');

		await switchClient(2);

		await lockHandler().acquireLock(LockType.Sync, LockClientType.Mobile, '222');

		expect((await lockHandler().locks(LockType.Sync)).length).toBe(2);

		{
			await lockHandler().releaseLock(LockType.Sync, LockClientType.Mobile, '222');
			const locks = await lockHandler().locks(LockType.Sync);
			expect(locks.length).toBe(1);
			expect(locks[0].clientId).toBe('111');
		}
	}));

	it('should auto-refresh a lock', (async () => {
		const handler = newLockHandler({ autoRefreshInterval: 100 * timeoutMultiplier });
		const lock = await handler.acquireLock(LockType.Sync, LockClientType.Desktop, '111');
		const lockBefore = activeLock(await handler.locks(), new Date(), handler.lockTtl, LockType.Sync, LockClientType.Desktop, '111');
		handler.startAutoLockRefresh(lock, () => {});
		await msleep(500 * timeoutMultiplier);
		const lockAfter = activeLock(await handler.locks(), new Date(), handler.lockTtl, LockType.Sync, LockClientType.Desktop, '111');
		expect(lockAfter.updatedTime).toBeGreaterThan(lockBefore.updatedTime);
		handler.stopAutoLockRefresh(lock);
	}));

	it('should call the error handler when lock has expired while being auto-refreshed', (async () => {
		const handler = newLockHandler({
			lockTtl: 50 * timeoutMultiplier,
			autoRefreshInterval: 200 * timeoutMultiplier,
		});

		const lock = await handler.acquireLock(LockType.Sync, LockClientType.Desktop, '111');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let autoLockError: any = null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		handler.startAutoLockRefresh(lock, (error: any) => {
			autoLockError = error;
		});

		try {
			await msleep(250 * timeoutMultiplier);

			expect(autoLockError).toBeTruthy();
			expect(autoLockError.code).toBe('lockExpired');
		} finally {
			handler.stopAutoLockRefresh(lock);
		}
	}));

	it('should not allow sync locks if there is an exclusive lock', (async () => {
		await lockHandler().acquireLock(LockType.Exclusive, LockClientType.Desktop, '111');

		await expectThrow(async () => {
			await lockHandler().acquireLock(LockType.Sync, LockClientType.Mobile, '222');
		}, 'hasExclusiveLock');
	}));

	it('should not allow exclusive lock if there are sync locks', (async () => {
		const lockHandler = newLockHandler({ lockTtl: 1000 * 60 * 60 });
		if (lockHandler.useBuiltInLocks) return; // Tested server side

		await lockHandler.acquireLock(LockType.Sync, LockClientType.Mobile, '111');
		await lockHandler.acquireLock(LockType.Sync, LockClientType.Mobile, '222');

		await expectThrow(async () => {
			await lockHandler.acquireLock(LockType.Exclusive, LockClientType.Desktop, '333');
		}, 'hasSyncLock');
	}));

	it('should allow exclusive lock if the sync locks have expired', (async () => {
		const lockHandler = newLockHandler({ lockTtl: 500 * timeoutMultiplier });
		if (lockHandler.useBuiltInLocks) return; // Tested server side

		await lockHandler.acquireLock(LockType.Sync, LockClientType.Mobile, '111');
		await lockHandler.acquireLock(LockType.Sync, LockClientType.Mobile, '222');

		await msleep(600 * timeoutMultiplier);

		await expectNotThrow(async () => {
			await lockHandler.acquireLock(LockType.Exclusive, LockClientType.Desktop, '333');
		});
	}));

	it('should decide what is the active exclusive lock', (async () => {
		const lockHandler = newLockHandler();

		{
			const locks: Lock[] = [
				{
					type: LockType.Exclusive,
					clientId: '1',
					clientType: LockClientType.Desktop,
					updatedTime: Date.now(),
				},
			];

			await msleep(100);

			locks.push({
				type: LockType.Exclusive,
				clientId: '2',
				clientType: LockClientType.Desktop,
				updatedTime: Date.now(),
			});

			const lock = activeLock(locks, new Date(), lockHandler.lockTtl, LockType.Exclusive);
			expect(lock.clientId).toBe('1');
		}
	}));

	// it('should ignore locks by same client when trying to acquire exclusive lock', (async () => {
	// 	const lockHandler = newLockHandler();

	// 	await lockHandler.acquireLock(LockType.Sync, LockClientType.Desktop, '111');

	// 	await expectThrow(async () => {
	// 		await lockHandler.acquireLock(LockType.Exclusive, LockClientType.Desktop, '111', { clearExistingSyncLocksFromTheSameClient: false });
	// 	}, 'hasSyncLock');

	// 	await expectNotThrow(async () => {
	// 		await lockHandler.acquireLock(LockType.Exclusive, LockClientType.Desktop, '111', { clearExistingSyncLocksFromTheSameClient: true });
	// 	});

	// 	const lock = activeLock(await lockHandler.locks(), new Date(), lockHandler.lockTtl, LockType.Exclusive);
	// 	expect(lock.clientId).toBe('111');
	// }));

});
