import LockHandler, { LockType, LockHandlerOptions, Lock } from 'lib/services/synchronizer/LockHandler';

require('app-module-path').addPath(__dirname);

const { isNetworkSyncTarget, asyncTest, fileApi, setupDatabaseAndSynchronizer, synchronizer, switchClient, msleep, expectThrow, expectNotThrow } = require('test-utils.js');

process.on('unhandledRejection', (reason:any, p:any) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

// For tests with memory of file system we can use low intervals to make the tests faster.
// However if we use such low values with network sync targets, some calls might randomly fail with
// ECONNRESET and similar errors (Dropbox or OneDrive migth also throttle). Also we can't use a
// low lock TTL value because the lock might expire between the time it's written and the time it's checked.
// For that reason we add this multiplier for non-memory sync targets.
const timeoutMultipler = isNetworkSyncTarget() ? 100 : 1;

let lockHandler_:LockHandler = null;

function newLockHandler(options:LockHandlerOptions = null):LockHandler {
	return new LockHandler(fileApi(), options);
}

function lockHandler():LockHandler {
	if (lockHandler_) return lockHandler_;
	lockHandler_ = new LockHandler(fileApi());
	return lockHandler_;
}

describe('synchronizer_LockHandler', function() {

	beforeEach(async (done:Function) => {
		// logger.setLevel(Logger.LEVEL_WARN);
		lockHandler_ = null;
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		await synchronizer().start(); // Need to sync once to setup the sync target and allow locks to work
		// logger.setLevel(Logger.LEVEL_DEBUG);
		done();
	});

	it('should acquire and release a sync lock', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '123456');
		const locks = await lockHandler().locks(LockType.Sync);
		expect(locks.length).toBe(1);
		expect(locks[0].type).toBe(LockType.Sync);
		expect(locks[0].clientId).toBe('123456');
		expect(locks[0].clientType).toBe('mobile');

		await lockHandler().releaseLock(LockType.Sync, 'mobile', '123456');
		expect((await lockHandler().locks(LockType.Sync)).length).toBe(0);
	}));

	it('should not use files that are not locks', asyncTest(async () => {
		await fileApi().put('locks/desktop.ini', 'a');
		await fileApi().put('locks/exclusive.json', 'a');
		await fileApi().put('locks/garbage.json', 'a');
		await fileApi().put('locks/sync_mobile_72c4d1b7253a4475bfb2f977117d26ed.json', 'a');

		const locks = await lockHandler().locks(LockType.Sync);
		expect(locks.length).toBe(1);
	}));

	it('should allow multiple sync locks', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '111');

		await switchClient(2);

		await lockHandler().acquireLock(LockType.Sync, 'mobile', '222');

		expect((await lockHandler().locks(LockType.Sync)).length).toBe(2);

		{
			await lockHandler().releaseLock(LockType.Sync, 'mobile', '222');
			const locks = await lockHandler().locks(LockType.Sync);
			expect(locks.length).toBe(1);
			expect(locks[0].clientId).toBe('111');
		}
	}));

	it('should auto-refresh a lock', asyncTest(async () => {
		const handler = newLockHandler({ autoRefreshInterval: 100 * timeoutMultipler });
		const lock = await handler.acquireLock(LockType.Sync, 'desktop', '111');
		const lockBefore = await handler.activeLock(LockType.Sync, 'desktop', '111');
		handler.startAutoLockRefresh(lock, () => {});
		await msleep(500 * timeoutMultipler);
		const lockAfter = await handler.activeLock(LockType.Sync, 'desktop', '111');
		expect(lockAfter.updatedTime).toBeGreaterThan(lockBefore.updatedTime);
		handler.stopAutoLockRefresh(lock);
	}));

	it('should call the error handler when lock has expired while being auto-refreshed', asyncTest(async () => {
		const handler = newLockHandler({
			lockTtl: 50 * timeoutMultipler,
			autoRefreshInterval: 200 * timeoutMultipler,
		});

		const lock = await handler.acquireLock(LockType.Sync, 'desktop', '111');
		let autoLockError:any = null;
		handler.startAutoLockRefresh(lock, (error:any) => {
			autoLockError = error;
		});

		await msleep(250 * timeoutMultipler);

		expect(autoLockError.code).toBe('lockExpired');

		handler.stopAutoLockRefresh(lock);
	}));

	it('should not allow sync locks if there is an exclusive lock', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Exclusive, 'desktop', '111');

		await expectThrow(async () => {
			await lockHandler().acquireLock(LockType.Sync, 'mobile', '222');
		}, 'hasExclusiveLock');
	}));

	it('should not allow exclusive lock if there are sync locks', asyncTest(async () => {
		const lockHandler = newLockHandler({ lockTtl: 1000 * 60 * 60 });

		await lockHandler.acquireLock(LockType.Sync, 'mobile', '111');
		await lockHandler.acquireLock(LockType.Sync, 'mobile', '222');

		await expectThrow(async () => {
			await lockHandler.acquireLock(LockType.Exclusive, 'desktop', '333');
		}, 'hasSyncLock');
	}));

	it('should allow exclusive lock if the sync locks have expired', asyncTest(async () => {
		const lockHandler = newLockHandler({ lockTtl: 500 * timeoutMultipler });

		await lockHandler.acquireLock(LockType.Sync, 'mobile', '111');
		await lockHandler.acquireLock(LockType.Sync, 'mobile', '222');

		await msleep(600 * timeoutMultipler);

		await expectNotThrow(async () => {
			await lockHandler.acquireLock(LockType.Exclusive, 'desktop', '333');
		});
	}));

	it('should decide what is the active exclusive lock', asyncTest(async () => {
		const lockHandler = newLockHandler();

		{
			const lock1:Lock = { type: LockType.Exclusive, clientId: '1', clientType: 'd' };
			const lock2:Lock = { type: LockType.Exclusive, clientId: '2', clientType: 'd' };
			await lockHandler.saveLock_(lock1);
			await msleep(100);
			await lockHandler.saveLock_(lock2);

			const activeLock = await lockHandler.activeLock(LockType.Exclusive);
			expect(activeLock.clientId).toBe('1');
		}
	}));

	// it('should not have race conditions', asyncTest(async () => {
	// 	const lockHandler = newLockHandler();

	// 	const clients = [];
	// 	for (let i = 0; i < 20; i++) {
	// 		clients.push({
	// 			id: 'client' + i,
	// 			type: 'desktop',
	// 		});
	// 	}

	// 	for (let loopIndex = 0; loopIndex < 1000; loopIndex++) {
	// 		const promises:Promise<void | Lock>[] = [];
	// 		for (let clientIndex = 0; clientIndex < clients.length; clientIndex++) {
	// 			const client = clients[clientIndex];

	// 			promises.push(
	// 				lockHandler.acquireLock(LockType.Exclusive, client.type, client.id).catch(() => {})
	// 			);

	// 			// if (gotLock) {
	// 			// 	await msleep(100);
	// 			// 	const locks = await lockHandler.locks(LockType.Exclusive);
	// 			// 	console.info('=======================================');
	// 			// 	console.info(locks);
	// 			// 	lockHandler.releaseLock(LockType.Exclusive, client.type, client.id);
	// 			// }

	// 			// await msleep(500);
	// 		}

	// 		const result = await Promise.all(promises);
	// 		const locks = result.filter((lock:any) => !!lock);

	// 		expect(locks.length).toBe(1);
	// 		const lock:Lock = locks[0] as Lock;
	// 		const allLocks = await lockHandler.locks();
	// 		console.info('================================', allLocks);
	// 		lockHandler.releaseLock(LockType.Exclusive, lock.clientType, lock.clientId);
	// 	}
	// }));

});
