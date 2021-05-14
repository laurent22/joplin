import { NotificationLevel } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, createUserAndSession } from '../../utils/testing/testUtils';

describe('index_notification', function() {

	beforeAll(async () => {
		await beforeAllDb('index_notification');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should update notification', async function() {
		const { user, session } = await createUserAndSession();

		const model = models().notification();

		await model.add(user.id, 'my_notification', NotificationLevel.Normal, 'testing notification');

		const notification = await model.loadByKey(user.id, 'my_notification');

		expect(notification.read).toBe(0);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'PATCH',
				url: `/notifications/${notification.id}`,
				body: {
					read: 1,
				},
			},
		});

		await routeHandler(context);

		expect((await model.loadByKey(user.id, 'my_notification')).read).toBe(1);
	});

});
