import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createItem } from '../utils/testing/testUtils';
import { EmailSender, User } from '../db';
import { ErrorUnprocessableEntity } from '../utils/errors';

describe('UserModel', function() {

	beforeAll(async () => {
		await beforeAllDb('UserModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should validate user objects', async function() {
		const { user: user1 } = await createUserAndSession(2, false);
		const { user: user2 } = await createUserAndSession(3, false);

		let error = null;

		// Email must be set
		error = await checkThrowAsync(async () => await models().user().save({ email: '', password: '1234546' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// Password must be set
		error = await checkThrowAsync(async () => await models().user().save({ email: 'newone@example.com', password: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// email must be set
		error = await checkThrowAsync(async () => await models().user().save({ id: user1.id, email: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// password must be set
		error = await checkThrowAsync(async () => await models().user().save({ id: user1.id, password: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// there is already a user with this email
		error = await checkThrowAsync(async () => await models().user().save({ id: user1.id, email: user2.email }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// check that the email is valid
		error = await checkThrowAsync(async () => await models().user().save({ id: user1.id, email: 'ohno' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);
	});

	test('should delete a user', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(2, false);

		const userModel = models().user();

		const allUsers: User[] = await userModel.all();
		const beforeCount: number = allUsers.length;

		await createItem(session1.id, 'root:/test.txt:', 'testing');

		// Admin can delete any user
		expect(!!(await models().session().load(session1.id))).toBe(true);
		expect((await models().item().all()).length).toBe(1);
		expect((await models().userItem().all()).length).toBe(1);
		await models().user().delete(user1.id);
		expect((await userModel.all()).length).toBe(beforeCount - 1);
		expect(!!(await models().session().load(session1.id))).toBe(false);
		expect((await models().item().all()).length).toBe(0);
		expect((await models().userItem().all()).length).toBe(0);
	});

	test('should push an email when creating a new user', async function() {
		const { user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		const emails = await models().email().all();
		expect(emails.length).toBe(2);
		expect(emails.find(e => e.recipient_email === user1.email)).toBeTruthy();
		expect(emails.find(e => e.recipient_email === user2.email)).toBeTruthy();

		const email = emails[0];
		expect(email.subject.trim()).toBeTruthy();
		expect(email.body.includes('/confirm?token=')).toBeTruthy();
		expect(email.sender_id).toBe(EmailSender.NoReply);
		expect(email.sent_success).toBe(0);
		expect(email.sent_time).toBe(0);
		expect(email.error).toBe('');
	});

});
