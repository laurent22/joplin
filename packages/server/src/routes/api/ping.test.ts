import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext } from '../../utils/testing/testUtils';

describe('api_ping', () => {

	beforeAll(async () => {
		await beforeAllDb('api_ping');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should ping', async () => {
		const context = await koaAppContext({
			request: {
				url: '/api/ping',
			},
		});

		await routeHandler(context);

		const body = context.response.body as any;

		expect(context.response.status).toBe(200);
		expect(body.status).toBe('ok');
		expect(body.message).toBe('Joplin Server is running');
	});

});
