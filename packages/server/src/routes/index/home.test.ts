import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession } from '../../utils/testing/testUtils';

describe('index/home', () => {

	beforeAll(async () => {
		await beforeAllDb('index/home');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should show the home page', async () => {
		const { user, session } = await createUserAndSession();

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/home',
			},
		});

		await routeHandler(context);

		expect((context.response.body as any).indexOf(user.email) >= 0).toBe(true);
	});

});
