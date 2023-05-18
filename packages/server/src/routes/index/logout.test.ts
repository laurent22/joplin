import routeHandler from '../../middleware/routeHandler';
import { cookieGet } from '../../utils/cookies';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, createUserAndSession } from '../../utils/testing/testUtils';

describe('index_logout', () => {

	beforeAll(async () => {
		await beforeAllDb('index_logout');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should logout', async () => {
		const { session } = await createUserAndSession();

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'POST',
				url: '/logout',
			},
		});

		expect(cookieGet(context, 'sessionId')).toBe(session.id);
		expect(!!(await models().session().load(session.id))).toBe(true);
		await routeHandler(context);

		expect(!cookieGet(context, 'sessionId')).toBe(true);
		expect(!!(await models().session().load(session.id))).toBe(false);
	});

});
