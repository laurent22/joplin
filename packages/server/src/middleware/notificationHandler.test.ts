import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, koaAppContext, koaNext } from '../utils/testing/testUtils';
import { defaultAdminEmail, defaultAdminPassword, Notification } from '../db';
import notificationHandler from './notificationHandler';

describe('notificationHandler', function() {

	beforeAll(async () => {
		await beforeAllDb('notificationHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should check admin password', async function() {
		const { session } = await createUserAndSession(1, true);

		// The default admin password actually doesn't pass the complexity
		// check, so we need to skip validation for testing here. Eventually, a
		// better mechanism to set the initial default admin password should
		// probably be implemented.

		const admin = await models().user().save({
			email: defaultAdminEmail,
			password: defaultAdminPassword,
			is_admin: 1,
		}, { skipValidation: true });

		{
			const ctx = await koaAppContext({ sessionId: session.id });
			await notificationHandler(ctx, koaNext);

			const notifications: Notification[] = await models().notification().all();
			expect(notifications.length).toBe(1);
			expect(notifications[0].key).toBe('change_admin_password');
			expect(notifications[0].read).toBe(0);

			expect(ctx.joplin.notifications.length).toBe(1);
		}

		{
			await models().user().save({
				id: admin.id,
				password: 'changed!',
			}, { skipValidation: true });

			const ctx = await koaAppContext({ sessionId: session.id });
			await notificationHandler(ctx, koaNext);

			const notifications: Notification[] = await models().notification().all();
			expect(notifications.length).toBe(1);
			expect(notifications[0].key).toBe('change_admin_password');
			expect(notifications[0].read).toBe(1);

			expect(ctx.joplin.notifications.length).toBe(0);
		}
	});

	test('should not check admin password for non-admin', async function() {
		const { session } = await createUserAndSession(1, false);

		await createUserAndSession(2, true, {
			email: defaultAdminEmail,
			password: defaultAdminPassword,
		});

		const context = await koaAppContext({ sessionId: session.id });
		await notificationHandler(context, koaNext);

		const notifications: Notification[] = await models().notification().all();
		expect(notifications.length).toBe(0);
	});

});
