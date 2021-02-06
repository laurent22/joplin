import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, createUserAndSession } from '../../utils/testing/testUtils';

describe('index_logout', function() {

	beforeAll(async () => {
		await beforeAllDb('index_logout');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should logout', async function() {
		const { session } = await createUserAndSession();

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'POST',
				url: '/logout',
			},
		});

		expect(context.cookies.get('sessionId')).toBe(session.id);
		expect(!!(await models().session().load(session.id))).toBe(true);
		await routeHandler(context);

		expect(!context.cookies.get('sessionId')).toBe(true);
		expect(!!(await models().session().load(session.id))).toBe(false);
	});

});
