import { beforeAllDb, afterAllTests, beforeEachDb, models, createUser, expectThrow } from '../utils/testing/testUtils';
import { Day } from '../utils/time';

describe('UserDeletionModel', () => {

	beforeAll(async () => {
		await beforeAllDb('UserDeletionModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should add a deletion operation', async () => {
		{
			const user = await createUser(1);

			const scheduleTime = Date.now() + 1000;
			await models().userDeletion().add(user.id, scheduleTime);
			const deletion = await models().userDeletion().byUserId(user.id);
			expect(deletion.user_id).toBe(user.id);
			expect(deletion.process_account).toBe(1);
			expect(deletion.process_data).toBe(1);
			expect(deletion.scheduled_time).toBe(scheduleTime);
			expect(deletion.error).toBe('');
			expect(deletion.success).toBe(0);
			expect(deletion.start_time).toBe(0);
			expect(deletion.end_time).toBe(0);
			await models().userDeletion().delete(deletion.id);
		}

		{
			const user = await createUser(2);

			await models().userDeletion().add(user.id, Date.now() + 1000, {
				processData: true,
				processAccount: false,
			});

			const deletion = await models().userDeletion().byUserId(user.id);
			expect(deletion.process_data).toBe(1);
			expect(deletion.process_account).toBe(0);
		}

		{
			const user = await createUser(3);
			await models().userDeletion().add(user.id, Date.now() + 1000);
			await expectThrow(async () => models().userDeletion().add(user.id, Date.now() + 1000));
		}
	});

	test('should provide the next deletion operation', async () => {
		expect(await models().userDeletion().next()).toBeFalsy();

		jest.useFakeTimers();

		const t0 = new Date('2021-12-14').getTime();
		jest.setSystemTime(t0);

		const user1 = await createUser(1);
		const user2 = await createUser(2);

		await models().userDeletion().add(user1.id, t0 + 100000);
		await models().userDeletion().add(user2.id, t0 + 100);

		expect(await models().userDeletion().next()).toBeFalsy();

		jest.setSystemTime(t0 + 200);

		expect((await models().userDeletion().next()).user_id).toBe(user2.id);

		jest.setSystemTime(t0 + 200000);

		const next1 = await models().userDeletion().next();
		expect(next1.user_id).toBe(user2.id);
		await models().userDeletion().start(next1.id);
		await models().userDeletion().end(next1.id, true, null);

		const next2 = await models().userDeletion().next();
		expect(next2.user_id).toBe(user1.id);
		await models().userDeletion().start(next2.id);
		await models().userDeletion().end(next2.id, true, null);

		const next3 = await models().userDeletion().next();
		expect(next3).toBeFalsy();

		jest.useRealTimers();
	});

	test('should start and stop deletion jobs', async () => {
		jest.useFakeTimers();

		const t0 = new Date('2021-12-14').getTime();
		jest.setSystemTime(t0);

		const user1 = await createUser(1);
		const user2 = await createUser(2);

		await models().userDeletion().add(user1.id, t0 + 10);
		await models().userDeletion().add(user2.id, t0 + 100);

		jest.setSystemTime(t0 + 200);

		const next1 = await models().userDeletion().next();
		await models().userDeletion().start(next1.id);

		{
			const d = await models().userDeletion().load(next1.id);
			expect(d.start_time).toBe(t0 + 200);
			expect(d.updated_time).toBe(t0 + 200);
			expect(d.end_time).toBe(0);
		}

		jest.setSystemTime(t0 + 300);

		await models().userDeletion().end(next1.id, false, 'error!');

		{
			const d = await models().userDeletion().load(next1.id);
			expect(d.start_time).toBe(t0 + 200);
			expect(d.updated_time).toBe(t0 + 300);
			expect(d.end_time).toBe(t0 + 300);
			expect(d.success).toBe(0);
			expect(JSON.parse(d.error)).toEqual({ message: 'error!' });
		}

		const next2 = await models().userDeletion().next();
		await models().userDeletion().start(next2.id);
		await models().userDeletion().end(next2.id, true, null);

		{
			const d = await models().userDeletion().load(next2.id);
			expect(d.start_time).toBe(t0 + 300);
			expect(d.updated_time).toBe(t0 + 300);
			expect(d.end_time).toBe(t0 + 300);
			expect(d.success).toBe(1);
			expect(d.error).toBe('');
		}

		jest.useRealTimers();
	});

	test('should auto-add users for deletion', async () => {
		jest.useFakeTimers();

		const t0 = new Date('2022-02-22').getTime();
		jest.setSystemTime(t0);

		await createUser(1);
		const user2 = await createUser(2);

		await models().user().save({
			id: user2.id,
			enabled: 0,
			disabled_time: t0,
		});

		await models().userDeletion().autoAdd(10, 90 * Day, t0 + 3 * Day);

		expect(await models().userDeletion().count()).toBe(0);

		const t1 = new Date('2022-05-30').getTime();
		jest.setSystemTime(t1);

		await models().userDeletion().autoAdd(10, 90 * Day, t1 + 3 * Day);

		expect(await models().userDeletion().count()).toBe(1);
		const d = (await models().userDeletion().all())[0];
		expect(d.user_id).toBe(user2.id);
		expect(d.scheduled_time).toBe(t1 + 3 * Day);

		// Shouldn't add it again if running autoAdd() again
		await models().userDeletion().autoAdd(10, 90 * Day, t1 + 3 * Day);
		expect(await models().userDeletion().count()).toBe(1);

		jest.useRealTimers();
	});

});
