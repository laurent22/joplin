import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllDb, beforeEachDb, koaAppContext } from '../../utils/testing/testUtils';

describe('api_ping', function() {

	beforeAll(async () => {
		await beforeAllDb('api_ping');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should ping', async function() {
		const context = await koaAppContext({
			path: '/api/ping',
		});

		await routeHandler(context);

		expect(context.response.status).toBe(200);
		expect(context.response.body.status).toBe('ok');
		expect(context.response.body.message).toBe('Joplin Server is running');
	});

});
