import { defaultLockTtl, LockType } from '@joplin/lib/services/synchronizer/LockHandler';
import { ErrorConflict } from '../utils/errors';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUserAndSession, expectHttpError } from '../utils/testing/testUtils';

describe('LockModel', function() {

	beforeAll(async () => {
		await beforeAllDb('LockModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should allow exclusive lock if the sync locks have expired', async function() {
		jest.useFakeTimers('modern');

		const { user } = await createUserAndSession(1);

		const t1 = new Date('2020-01-01').getTime();
		jest.setSystemTime(t1);

		await models().lock().acquireLock(user.id, LockType.Sync, 'desktop', '1111');
		await models().lock().acquireLock(user.id, LockType.Sync, 'desktop', '2222');

		// First confirm that it's not possible to acquire an exclusive lock if
		// there are sync locks.
		await expectHttpError(async () => models().lock().acquireLock(user.id, LockType.Exclusive, 'desktop', '3333'), ErrorConflict.httpCode);

		jest.setSystemTime(t1 + defaultLockTtl + 1);

		// Now that the sync locks have expired check that it's possible to
		// acquire a sync lock.
		const exclusiveLock = await models().lock().acquireLock(user.id, LockType.Exclusive, 'desktop', '3333');
		expect(exclusiveLock).toBeTruthy();

		jest.useRealTimers();
	});

	test('should keep user locks separated', async function() {
		const { user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		await models().lock().acquireLock(user1.id, LockType.Sync, 'desktop', '1111');

		// If user 1 tries to get an exclusive lock, it should fail
		await expectHttpError(async () => models().lock().acquireLock(user1.id, LockType.Exclusive, 'desktop', '3333'), ErrorConflict.httpCode);

		// But it should work for user 2
		const exclusiveLock = await models().lock().acquireLock(user2.id, LockType.Exclusive, 'desktop', '3333');
		expect(exclusiveLock).toBeTruthy();
	});

});
