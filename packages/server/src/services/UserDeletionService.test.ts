import config from '../config';
import { shareFolderWithUser } from '../utils/testing/shareApiUtils';
import { afterAllTests, beforeAllDb, beforeEachDb, createNote, createUserAndSession, models } from '../utils/testing/testUtils';
import { Env } from '../utils/types';
import { BackupItemType, UserFlagType } from './database/types';
import UserDeletionService from './UserDeletionService';

const newService = () => {
	return new UserDeletionService(Env.Dev, models(), config());
};

describe('UserDeletionService', () => {

	beforeAll(async () => {
		await beforeAllDb('UserDeletionService');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should delete user data', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		await createNote(session1.id, { title: 'testing1' });
		await createNote(session2.id, { title: 'testing2' });

		const t0 = new Date('2021-12-14').getTime();
		const t1 = t0 + 1000;

		await models().userFlag().toggle(user1.id, UserFlagType.ManuallyDisabled, true);

		const job = await models().userDeletion().add(user1.id, t1, {
			processData: true,
			processAccount: false,
		});

		expect(await models().item().count()).toBe(2);
		expect(await models().change().count()).toBe(2);

		const service = newService();
		await service.processDeletionJob(job, { sleepBetweenOperations: 0 });

		expect(await models().item().count()).toBe(1);
		expect(await models().change().count()).toBe(1);

		const item = (await models().item().all())[0];
		expect(item.owner_id).toBe(user2.id);

		const change = (await models().change().all())[0];
		expect(change.user_id).toBe(user2.id);

		expect(await models().user().count()).toBe(2);
		expect(await models().session().count()).toBe(2);
	});

	test('should delete user account', async () => {
		const { user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		const t0 = new Date('2021-12-14').getTime();
		const t1 = t0 + 1000;

		await models().userFlag().toggle(user1.id, UserFlagType.ManuallyDisabled, true);

		const job = await models().userDeletion().add(user1.id, t1, {
			processData: false,
			processAccount: true,
		});

		expect(await models().user().count()).toBe(2);
		expect(await models().session().count()).toBe(2);

		const beforeTime = Date.now();

		const service = newService();
		await service.processDeletionJob(job, { sleepBetweenOperations: 0 });

		expect(await models().user().count()).toBe(1);
		expect(await models().session().count()).toBe(1);

		const user = (await models().user().all())[0];
		expect(user.id).toBe(user2.id);

		const backupItems = await models().backupItem().all();
		expect(backupItems.length).toBe(1);
		const backupItem = backupItems[0];
		expect(backupItem.key).toBe(user1.email);
		expect(backupItem.type).toBe(BackupItemType.UserAccount);
		expect(backupItem.created_time).toBeGreaterThanOrEqual(beforeTime);

		const content = JSON.parse(backupItem.content.toString());
		expect(content.user.id).toBe(user1.id);
		expect(content.user.email).toBe(user1.email);
		expect(content.flags.length).toBe(1);
	});

	test('should not delete notebooks that are not owned', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F2', [
			{
				id: '000000000000000000000000000000F2',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		]);

		expect(await models().share().count()).toBe(1);
		expect(await models().shareUser().count()).toBe(1);

		await models().userFlag().toggle(user2.id, UserFlagType.ManuallyDisabled, true);

		const job = await models().userDeletion().add(user2.id, Date.now());
		const service = newService();
		await service.processDeletionJob(job, { sleepBetweenOperations: 0 });

		expect(await models().share().count()).toBe(1); // The share object has not (and should not) been deleted
		expect(await models().shareUser().count()).toBe(0); // However all the invitations are gone
		expect(await models().item().count()).toBe(2);
	});

	test('should not delete notebooks that are owned', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F2', [
			{
				id: '000000000000000000000000000000F2',
				children: [
					{
						id: '00000000000000000000000000000001',
					},
				],
			},
		]);

		expect(await models().share().count()).toBe(1);
		expect(await models().shareUser().count()).toBe(1);

		await models().userFlag().toggle(user1.id, UserFlagType.ManuallyDisabled, true);

		const job = await models().userDeletion().add(user1.id, Date.now());
		const service = newService();
		await service.processDeletionJob(job, { sleepBetweenOperations: 0 });

		expect(await models().share().count()).toBe(0);
		expect(await models().shareUser().count()).toBe(0);
		expect(await models().item().count()).toBe(0);
	});

	test('should not do anything if the user is still enabled', async () => {
		const { user: user1 } = await createUserAndSession(1);

		const t0 = new Date('2021-12-14').getTime();
		const t1 = t0 + 1000;

		const job = await models().userDeletion().add(user1.id, t1, {
			processData: false,
			processAccount: true,
		});

		expect(await models().userDeletion().count()).toBe(1);

		const service = newService();
		await service.processDeletionJob(job, { sleepBetweenOperations: 0 });

		// Nothing has been done because the user is still enabled
		expect(await models().user().count()).toBe(1);

		// And the job should have been removed from the queue
		expect(await models().userDeletion().count()).toBe(0);
	});

});
