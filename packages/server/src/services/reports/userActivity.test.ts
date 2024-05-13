import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, createFolder, updateFolder, dbSlave, deleteFolder } from '../../utils/testing/testUtils';
import { Hour } from '../../utils/time';
import userActivity from './userActivity';

describe('reports/userActivity', () => {

	beforeAll(async () => {
		await beforeAllDb('reports/userActivity');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a report on user activity', async () => {
		const { session: session1, user: user1 } = await createUserAndSession(1, false);
		const { session: session2, user: user2 } = await createUserAndSession(2, false);

		expect(await userActivity(dbSlave())).toEqual([]);

		jest.useFakeTimers();

		const t0 = new Date('2022-01-01 00:00:00').getTime();
		jest.setSystemTime(t0);

		await createFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'folder 1a' });
		await updateFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'folder 1b' });

		const t1 = new Date('2022-01-01 02:00:00').getTime();
		jest.setSystemTime(t1);

		await updateFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'folder 1c' });
		await updateFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'folder 1d' });
		await deleteFolder(user1.id, '000000000000000000000000000000F1');

		await createFolder(session2.id, { id: '000000000000000000000000000000F2', title: 'folder 2a' });
		await updateFolder(session2.id, { id: '000000000000000000000000000000F2', title: 'folder 2b' });

		const results = await userActivity(dbSlave(), { batchSize: 2, interval: 1 * Hour });

		expect(results).toEqual(
			[
				{
					user_id: user1.id,
					total_count: 3,
					create_count: 0,
					update_count: 2,
					delete_count: 1,
					uploaded_size: 0,
				},
				{
					user_id: user2.id,
					total_count: 2,
					create_count: 1,
					update_count: 1,
					delete_count: 0,
					uploaded_size: 350, // Note: this will break whenever the item sync format is changed
				},
			],
		);

		jest.useRealTimers();
	});

});
