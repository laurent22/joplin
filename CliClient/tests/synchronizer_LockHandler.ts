import LockHandler, { LockType } from 'lib/services/synchronizer/LockHandler';

require('app-module-path').addPath(__dirname);

const { asyncTest, fileApi, setupDatabaseAndSynchronizer, switchClient, msleep, expectThrow, expectNotThrow } = require('test-utils.js');

process.on('unhandledRejection', (reason:any, p:any) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

let lockHandler_:LockHandler = null;
const locksDirname = 'locks';

function lockHandler():LockHandler {
	if (lockHandler_) return lockHandler_;
	lockHandler_ = new LockHandler(fileApi(), locksDirname);
	return lockHandler_;
}

describe('synchronizer_LockHandler', function() {

	beforeEach(async (done:Function) => {
		lockHandler_ = null;
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should acquire and release a sync lock', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '123456');
		const locks = await lockHandler().syncLocks();
		expect(locks.length).toBe(1);
		expect(locks[0].type).toBe(LockType.Sync);
		expect(locks[0].clientId).toBe('123456');
		expect(locks[0].clientType).toBe('mobile');

		await lockHandler().releaseLock(LockType.Sync, 'mobile', '123456');
		expect((await lockHandler().syncLocks()).length).toBe(0);
	}));

	it('should allow multiple sync locks', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '111');

		await switchClient(2);

		await lockHandler().acquireLock(LockType.Sync, 'mobile', '222');

		expect((await lockHandler().syncLocks()).length).toBe(2);

		{
			await lockHandler().releaseLock(LockType.Sync, 'mobile', '222');
			const locks = await lockHandler().syncLocks();
			expect(locks.length).toBe(1);
			expect(locks[0].clientId).toBe('111');
		}
	}));

	it('should refresh sync lock timestamp when acquiring again', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '111');

		const beforeTime = (await lockHandler().syncLocks())[0].updatedTime;
		await msleep(1);

		await lockHandler().acquireLock(LockType.Sync, 'mobile', '111');

		const afterTime = (await lockHandler().syncLocks())[0].updatedTime;

		expect(beforeTime).toBeLessThan(afterTime);
	}));

	it('should not allow sync locks if there is an exclusive lock', asyncTest(async () => {
		await lockHandler().acquireLock(LockType.Exclusive, 'desktop', '111');

		expectThrow(async () => {
			await lockHandler().acquireLock(LockType.Sync, 'mobile', '222');
		}, 'hasExclusiveLock');
	}));

	it('should not allow exclusive lock if there are sync locks', asyncTest(async () => {
		lockHandler().syncLockMaxAge = 1000 * 60 * 60;

		await lockHandler().acquireLock(LockType.Sync, 'mobile', '111');
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '222');

		expectThrow(async () => {
			await lockHandler().acquireLock(LockType.Exclusive, 'desktop', '333');
		}, 'hasSyncLock');
	}));

	it('should allow exclusive lock if the sync locks have expired', asyncTest(async () => {
		lockHandler().syncLockMaxAge = 1;

		await lockHandler().acquireLock(LockType.Sync, 'mobile', '111');
		await lockHandler().acquireLock(LockType.Sync, 'mobile', '222');

		await msleep(2);

		expectNotThrow(async () => {
			await lockHandler().acquireLock(LockType.Exclusive, 'desktop', '333');
		});
	}));

});
