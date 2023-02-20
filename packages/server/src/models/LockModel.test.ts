// Note that a lot of the testing logic is done from
// synchronizer_LockHandler.test so to fully test that it works, Joplin Server
// should be setup as a sync target for the test units.

import { ErrorConflict, ErrorUnprocessableEntity } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUserAndSession, expectHttpError } from '../utils/testing/testUtils';
import { LockType, LockClientType, defaultLockTtl } from '@joplin/lib/services/synchronizer/LockHandler';

describe('LockModel', () => {

	beforeAll(async () => {
		await beforeAllDb('LockModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should allow exclusive lock if the sync locks have expired', async () => {
		jest.useFakeTimers();

		const { user } = await createUserAndSession(1);

		const t1 = new Date('2020-01-01').getTime();
		jest.setSystemTime(t1);

		await models().lock().acquireLock(user.id, LockType.Sync, LockClientType.Desktop, '1111');
		await models().lock().acquireLock(user.id, LockType.Sync, LockClientType.Desktop, '2222');

		// First confirm that it's not possible to acquire an exclusive lock if
		// there are sync locks.
		await expectHttpError(async () => models().lock().acquireLock(user.id, LockType.Exclusive, LockClientType.Desktop, '3333'), ErrorConflict.httpCode);

		jest.setSystemTime(t1 + defaultLockTtl + 1);

		// Now that the sync locks have expired check that it's possible to
		// acquire a sync lock.
		const exclusiveLock = await models().lock().acquireLock(user.id, LockType.Exclusive, LockClientType.Desktop, '3333');
		expect(exclusiveLock).toBeTruthy();

		jest.useRealTimers();
	});

	test('should keep user locks separated', async () => {
		const { user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		await models().lock().acquireLock(user1.id, LockType.Sync, LockClientType.Desktop, '1111');

		// If user 1 tries to get an exclusive lock, it should fail
		await expectHttpError(async () => models().lock().acquireLock(user1.id, LockType.Exclusive, LockClientType.Desktop, '3333'), ErrorConflict.httpCode);

		// But it should work for user 2
		const exclusiveLock = await models().lock().acquireLock(user2.id, LockType.Exclusive, LockClientType.Desktop, '3333');
		expect(exclusiveLock).toBeTruthy();
	});

	test('should validate locks', async () => {
		const { user: user1 } = await createUserAndSession(1);

		await expectHttpError(async () => models().lock().acquireLock(user1.id, 'wrongtype' as any, LockClientType.Desktop, '1111'), ErrorUnprocessableEntity.httpCode);
		await expectHttpError(async () => models().lock().acquireLock(user1.id, LockType.Exclusive, 'wrongclienttype' as any, '1111'), ErrorUnprocessableEntity.httpCode);
		await expectHttpError(async () => models().lock().acquireLock(user1.id, LockType.Exclusive, LockClientType.Desktop, 'veryverylongclientidveryverylongclientidveryverylongclientidveryverylongclientid'), ErrorUnprocessableEntity.httpCode);
	});

	test('should expire locks', async () => {
		const { user } = await createUserAndSession(1);

		jest.useFakeTimers();

		const t1 = new Date('2020-01-01').getTime();
		jest.setSystemTime(t1);

		await models().lock().acquireLock(user.id, LockType.Sync, LockClientType.Desktop, '1111');
		const lock1 = (await models().lock().allLocks(user.id))[0];

		jest.setSystemTime(t1 + models().lock().lockTtl + 1);

		// If we call this again, at the same time it should expire old timers.
		await models().lock().acquireLock(user.id, LockType.Sync, LockClientType.Desktop, '2222');

		expect((await models().lock().allLocks(user.id)).length).toBe(1);
		const lock2 = (await models().lock().allLocks(user.id))[0];

		expect(lock1.id).not.toBe(lock2.id);

		jest.useRealTimers();
	});

});
