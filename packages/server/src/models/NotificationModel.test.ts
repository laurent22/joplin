import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow } from '../utils/testing/testUtils';
import { Notification, NotificationLevel } from '../services/database/types';
import { NotificationKey } from './NotificationModel';

describe('NotificationModel', () => {

	beforeAll(async () => {
		await beforeAllDb('NotificationModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should require a user to create the notification', async () => {
		await expectThrow(async () => models().notification().add('', NotificationKey.EmailConfirmed, NotificationLevel.Normal, NotificationKey.EmailConfirmed));
	});

	test('should create a notification', async () => {
		const { user } = await createUserAndSession(1, true);
		const model = models().notification();
		await model.add(user.id, NotificationKey.EmailConfirmed, NotificationLevel.Important, 'testing');
		const n: Notification = await model.loadByKey(user.id, NotificationKey.EmailConfirmed);
		expect(n.key).toBe(NotificationKey.EmailConfirmed);
		expect(n.message).toBe('testing');
		expect(n.level).toBe(NotificationLevel.Important);
	});

	test('should create only one notification per key', async () => {
		const { user } = await createUserAndSession(1, true);
		const model = models().notification();
		await model.add(user.id, NotificationKey.EmailConfirmed, NotificationLevel.Important, 'testing');
		await model.add(user.id, NotificationKey.EmailConfirmed, NotificationLevel.Important, 'testing');
		expect((await model.all()).length).toBe(1);
	});

	test('should mark a notification as read', async () => {
		const { user } = await createUserAndSession(1, true);
		const model = models().notification();
		await model.add(user.id, NotificationKey.EmailConfirmed, NotificationLevel.Important, 'testing');
		expect((await model.loadByKey(user.id, NotificationKey.EmailConfirmed)).read).toBe(0);
		await model.setRead(user.id, NotificationKey.EmailConfirmed);
		expect((await model.loadByKey(user.id, NotificationKey.EmailConfirmed)).read).toBe(1);
	});

});
