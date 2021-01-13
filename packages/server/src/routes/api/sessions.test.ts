import { Session } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models } from '../../utils/testing/testUtils';

describe('api_sessions', function() {

	beforeAll(async () => {
		await beforeAllDb('api_sessions');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should login user', async function() {
		const { user } = await createUserAndSession(1, false);

		const context = await koaAppContext({
			request: {
				method: 'POST',
				url: '/api/sessions',
				body: {
					email: user.email,
					password: '123456',
				},
			},
		});

		await routeHandler(context);

		expect(context.response.status).toBe(200);
		expect(!!context.response.body.id).toBe(true);

		const session: Session = await models().session().load(context.response.body.id);
		expect(session.user_id).toBe(user.id);
	});

	test('should not login user with wrong password', async function() {
		const { user } = await createUserAndSession(1, false);

		const context = await koaAppContext({
			request: {
				method: 'POST',
				url: '/api/sessions',
				body: {
					email: user.email,
					password: 'wrong',
				},
			},
		});

		await routeHandler(context);

		expect(context.response.status).toBe(403);
	});

});
