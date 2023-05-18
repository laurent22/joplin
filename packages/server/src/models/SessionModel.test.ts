import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';
import { defaultSessionTtl } from './SessionModel';

describe('SessionModel', () => {

	beforeAll(async () => {
		await beforeAllDb('SessionModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should delete expired sessions', async () => {
		jest.useFakeTimers();

		const t0 = new Date('2020-01-01T00:00:00').getTime();
		jest.setSystemTime(t0);

		const { user, password } = await createUserAndSession(1);
		await models().session().authenticate(user.email, password);

		jest.setSystemTime(new Date(t0 + defaultSessionTtl + 10));

		const lastSession = await models().session().authenticate(user.email, password);

		expect(await models().session().count()).toBe(3);

		await models().session().deleteExpiredSessions();

		expect(await models().session().count()).toBe(1);
		expect((await models().session().all())[0].id).toBe(lastSession.id);

		await models().session().authenticate(user.email, password);
		await models().session().deleteExpiredSessions();

		expect(await models().session().count()).toBe(2);

		jest.useRealTimers();
	});

});
