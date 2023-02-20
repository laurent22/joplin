import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, koaAppContext, koaNext } from '../utils/testing/testUtils';
import { Notification, UserFlagType } from '../services/database/types';
import { defaultAdminEmail, defaultAdminPassword } from '../db';
import notificationHandler from './notificationHandler';
import { AppContext } from '../utils/types';

const runNotificationHandler = async (sessionId: string): Promise<AppContext> => {
	const context = await koaAppContext({ sessionId: sessionId });
	await notificationHandler(context, koaNext);
	return context;
};

describe('notificationHandler', () => {

	beforeAll(async () => {
		await beforeAllDb('notificationHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should check admin password', async () => {
		const r = await createUserAndSession(1, true);
		const session = r.session;
		let admin = r.user;

		// The default admin password actually doesn't pass the complexity
		// check, so we need to skip validation for testing here. Eventually, a
		// better mechanism to set the initial default admin password should
		// probably be implemented.

		admin = await models().user().save({
			id: admin.id,
			email: defaultAdminEmail,
			password: defaultAdminPassword,
			is_admin: 1,
			email_confirmed: 1,
		}, { skipValidation: true });

		{
			const ctx = await runNotificationHandler(session.id);

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

			const ctx = await runNotificationHandler(session.id);

			const notifications: Notification[] = await models().notification().all();
			expect(notifications.length).toBe(1);
			expect(notifications[0].key).toBe('change_admin_password');
			expect(notifications[0].read).toBe(1);

			expect(ctx.joplin.notifications.length).toBe(0);
		}
	});

	test('should not check admin password for non-admin', async () => {
		const { session } = await createUserAndSession(1, false);

		await createUserAndSession(2, true, {
			email: defaultAdminEmail,
			password: defaultAdminPassword,
		});

		await runNotificationHandler(session.id);

		const notifications: Notification[] = await models().notification().all();
		expect(notifications.length).toBe(0);
	});

	test('should display a banner if the account is disabled', async () => {
		const { session, user } = await createUserAndSession(1);

		await models().userFlag().add(user.id, UserFlagType.FailedPaymentFinal);

		const ctx = await runNotificationHandler(session.id);

		expect(ctx.joplin.notifications.find(v => v.id === 'accountDisabled')).toBeTruthy();
	});

	test('should display a banner if the email is not confirmed', async () => {
		const { session, user } = await createUserAndSession(1);

		{
			const ctx = await runNotificationHandler(session.id);
			expect(ctx.joplin.notifications.find(v => v.id === 'confirmEmail')).toBeTruthy();
		}

		{
			await models().user().save({ id: user.id, email_confirmed: 1 });
			const ctx = await runNotificationHandler(session.id);
			expect(ctx.joplin.notifications.find(v => v.id === 'confirmEmail')).toBeFalsy();
		}
	});

});
