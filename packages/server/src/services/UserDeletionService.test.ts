import config from '../config';
import { afterAllTests, beforeAllDb, beforeEachDb, createNote, createUserAndSession, models } from '../utils/testing/testUtils';
import { Env } from '../utils/types';
import UserDeletionService from './UserDeletionService';

const newService = () => {
	return new UserDeletionService(Env.Dev, models(), config());
};

describe('UserDeletionService', function() {

	beforeAll(async () => {
		await beforeAllDb('UserDeletionService');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should delete a user data', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		await createNote(session1.id, { title: 'testing1' });
		await createNote(session2.id, { title: 'testing2' });

		const t0 = new Date('2021-12-14').getTime();
		const t1 = t0 + 1000;

		let job = await models().userDeletion().add(user1.id, t1, {
			processData: true,
			processAccount: false,
		});

		expect(await models().item().count()).toBe(2);
		expect(await models().change().count()).toBe(2);

		const service = newService();
		await service.processDeletionJob(job);

		job = await models().userDeletion().load(job.id);

		expect(await models().item().count()).toBe(1);
		expect(await models().change().count()).toBe(1);

		const item = (await models().item().all())[0];
		expect(item.owner_id).toBe(user2.id);

		const change = (await models().change().all())[0];
		expect(change.user_id).toBe(user2.id);
	});

});
