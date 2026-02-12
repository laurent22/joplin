import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';
import { AccountType } from './UserModel';

describe('ApplicationModel', () => {

	beforeAll(async () => {
		await beforeAllDb('ApplicationModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should throw if applicationAuthId is not an uuid', async () => {
		expect(models().application().createAppPassword('not-uuid')).rejects.toThrow('Application not authorized yet.');
	});

	test('should generate a notification after an application is authorized', async () => {
		const user = await models().user().save({
			email: 'test@example.com',
			password: '111111',
		});
		await models().application().createPreLoginRecord('mock-application-id', '127.0.0.1', 'mock-version', 'mock-platform', 'mock-type');
		await models().application().onAuthorizeUse('mock-application-id', user.id);

		const notifications = await models().notification().allUnreadByUserId(user.id);
		expect(notifications.length).toBe(1);
		expect(notifications[0].message).toBe('You have successfully authorised your application');
	});

	test('should register the application with the subscription when creating the app password', async () => {
		const { user } = await models().subscription().saveUserAndSubscription(
			'toto@example.com',
			'Toto',
			AccountType.Pro,
			'STRIPE_USER_ID',
			'STRIPE_SUB_ID',
		);

		const appId = 'mock-application-id';
		await models().application().createPreLoginRecord(appId, '127.0.0.1', 'mock-version', 'mock-platform', 'mock-type');
		await models().application().onAuthorizeUse(appId, user.id);
	});
});
