import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, koaNext } from '../utils/testing/testUtils';
import ownerHandler from './ownerHandler';

describe('ownerHandler', function() {

	beforeAll(async () => {
		await beforeAllDb('ownerHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should login user with valid session ID', async function() {
		const { user, session } = await createUserAndSession(1, false);

		const context = await koaAppContext({
			sessionId: session.id,
		});

		expect(!!context.owner).toBe(false);

		await ownerHandler(context, koaNext);

		expect(!!context.owner).toBe(true);
		expect(context.owner.id).toBe(user.id);
	});

	test('should not login user with invalid session ID', async function() {
		await createUserAndSession(1, false);

		const context = await koaAppContext({
			sessionId: 'ihack',
		});

		expect(!!context.owner).toBe(false);

		await ownerHandler(context, koaNext);

		expect(!!context.owner).toBe(false);
	});

});
