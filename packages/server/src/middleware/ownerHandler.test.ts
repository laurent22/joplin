import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, koaNext } from '../utils/testing/testUtils';
import ownerHandler from './ownerHandler';

describe('ownerHandler', () => {

	beforeAll(async () => {
		await beforeAllDb('ownerHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should login user with valid session ID', async () => {
		const { user, session } = await createUserAndSession(1, false);

		const context = await koaAppContext({
			sessionId: session.id,
		});

		context.joplin.owner = null;

		await ownerHandler(context, koaNext);

		expect(!!context.joplin.owner).toBe(true);
		expect(context.joplin.owner.id).toBe(user.id);
	});

	test('should not login user with invalid session ID', async () => {
		await createUserAndSession(1, false);

		const context = await koaAppContext({
			sessionId: 'ihack',
		});

		context.joplin.owner = null;

		await ownerHandler(context, koaNext);

		expect(!!context.joplin.owner).toBe(false);
	});

});
