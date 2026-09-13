import { NotificationLevel } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { NotificationKey } from '../../models/NotificationModel';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, createUserAndSession } from '../../utils/testing/testUtils';

describe('notifications', () => {

	beforeAll(async () => {
		await beforeAllDb('index_notification');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should update notification', async () => {
		const { user, session } = await createUserAndSession();

		const model = models().notification();

		await model.add(user.id, NotificationKey.EmailConfirmed, NotificationLevel.Normal, 'testing notification');

		const notification = await model.loadByKey(user.id, NotificationKey.EmailConfirmed);

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

		expect((await model.loadByKey(user.id, NotificationKey.EmailConfirmed)).read).toBe(1);
	});

	test('should not allow updating the notification of another user', async () => {
		const { user: user1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const model = models().notification();

		await model.add(user1.id, NotificationKey.EmailConfirmed, NotificationLevel.Normal, 'testing notification');

		const notification = await model.loadByKey(user1.id, NotificationKey.EmailConfirmed);

		const context = await koaAppContext({
			sessionId: session2.id,
			request: {
				method: 'PATCH',
				url: `/notifications/${notification.id}`,
				body: {
					read: 1,
				},
			},
		});

		await routeHandler(context);

		expect(context.response.status).toBe(404);
		expect((await model.loadByKey(user1.id, NotificationKey.EmailConfirmed)).read).toBe(0);
	});

});
