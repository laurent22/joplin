import { createUserAndSession, beforeAllDb, afterAllDb, beforeEachDb, models, expectThrow } from '../utils/testUtils';
import { Notification, NotificationLevel } from '../db';

describe('NotificationModel', function() {

	beforeAll(async () => {
		await beforeAllDb('NotificationModel');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should require a user to create the notification', async function() {
		await expectThrow(async () => models().notification().add('test', NotificationLevel.Normal, 'test'));
	});

	test('should create a notification', async function() {
		const { user } = await createUserAndSession(1, true);
		const model = models().notification({ userId: user.id });
		await model.add('test', NotificationLevel.Important, 'testing');
		const n: Notification = await model.loadByKey('test');
		expect(n.key).toBe('test');
		expect(n.message).toBe('testing');
		expect(n.level).toBe(NotificationLevel.Important);
	});

	test('should create only one notification per key', async function() {
		const { user } = await createUserAndSession(1, true);
		const model = models().notification({ userId: user.id });
		await model.add('test', NotificationLevel.Important, 'testing');
		await model.add('test', NotificationLevel.Important, 'testing');
		expect((await model.all()).length).toBe(1);
	});

	test('should mark a notification as read', async function() {
		const { user } = await createUserAndSession(1, true);
		const model = models().notification({ userId: user.id });
		await model.add('test', NotificationLevel.Important, 'testing');
		expect((await model.loadByKey('test')).read).toBe(0);
		await model.markAsRead('test');
		expect((await model.loadByKey('test')).read).toBe(1);
	});

});
