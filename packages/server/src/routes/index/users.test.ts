import { User } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { NotificationKey } from '../../models/NotificationModel';
import { ErrorForbidden } from '../../utils/errors';
import { execRequest, execRequestC } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, parseHtml, checkContextError, expectHttpError } from '../../utils/testing/testUtils';

export async function postUser(sessionId: string, email: string, password: string, props: any = null): Promise<User> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: '/users/new',
			body: {
				email: email,
				password: password,
				password2: password,
				post_button: true,
				...props,
			},
		},
	});

	await routeHandler(context);
	checkContextError(context);
	return context.response.body;
}

export async function patchUser(sessionId: string, user: any): Promise<User> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: '/users',
			body: {
				...user,
				post_button: true,
			},
		},
	});

	await routeHandler(context);
	checkContextError(context);
	return context.response.body;
}

export async function getUserHtml(sessionId: string, userId: string): Promise<string> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'GET',
			url: `/users/${userId}`,
		},
	});

	await routeHandler(context);
	checkContextError(context);
	return context.response.body;
}

describe('index_users', function() {

	beforeAll(async () => {
		await beforeAllDb('index_users');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a new user', async function() {
		const { session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com', '123456', {
			max_item_size: '',
		});
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);
		expect(newUser.max_item_size).toBe(0);

		const userModel = models().user();
		const userFromModel: User = await userModel.load(newUser.id);

		expect(!!userFromModel.password).toBe(true);
		expect(userFromModel.password === '123456').toBe(false); // Password has been hashed
	});

	test('new user should be able to login', async function() {
		const { session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com', '123456');
		const loggedInUser = await models().user().login('test@example.com', '123456');
		expect(!!loggedInUser).toBe(true);
		expect(loggedInUser.email).toBe('test@example.com');
	});

	test('should not create anything if user creation fail', async function() {
		const { session } = await createUserAndSession(1, true);

		const userModel = models().user();

		await postUser(session.id, 'test@example.com', '123456');

		const beforeUserCount = (await userModel.all()).length;
		expect(beforeUserCount).toBe(2);

		try {
			await postUser(session.id, 'test@example.com', '123456');
		} catch {
			// Ignore
		}

		const afterUserCount = (await userModel.all()).length;
		expect(beforeUserCount).toBe(afterUserCount);
	});

	test('should change user properties', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const userModel = models().user();

		await patchUser(session.id, { id: user.id, email: 'test2@example.com' });
		const modUser: User = await userModel.load(user.id);
		expect(modUser.email).toBe('test2@example.com');
	});

	test('should change the password', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const userModel = models().user();

		await patchUser(session.id, { id: user.id, password: 'abcdefgh', password2: 'abcdefgh' });
		const modUser = await userModel.login('user1@localhost', 'abcdefgh');
		expect(!!modUser).toBe(true);
		expect(modUser.id).toBe(user.id);
	});

	test('should get a user', async function() {
		const { user, session } = await createUserAndSession();

		const userHtml = await getUserHtml(session.id, user.id);
		const doc = parseHtml(userHtml);

		// <input class="input" type="email" name="email" value="user1@localhost"/>
		expect((doc.querySelector('input[name=email]') as any).value).toBe('user1@localhost');
	});

	test('should list users', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1, true);
		const { user: user2 } = await createUserAndSession(2, false);

		const result = await execRequest(session1.id, 'GET', 'users');
		expect(result).toContain(user1.email);
		expect(result).toContain(user2.email);
	});

	test('should allow user to set a password for new accounts', async function() {
		let user1 = await models().user().save({
			email: 'user1@localhost',
			must_set_password: 1,
			email_confirmed: 0,
			password: '123456',
		});

		const { user: user2 } = await createUserAndSession(2);
		const email = (await models().email().all()).find(e => e.recipient_id === user1.id);
		const matches = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
		const path = matches[1];
		const token = matches[3];

		// Check that the email at first is not confirmed
		// expect(user1.email_confirmed).toBe(0);
		// expect(user1.must_set_password).toBe(1);

		await execRequest('', 'GET', path, null, { query: { token } });

		// As soon as the confirmation page is opened, we know the email is valid
		user1 = await models().user().load(user1.id);
		expect(user1.email_confirmed).toBe(1);

		// Check that the token is valid
		expect(await models().token().isValid(user1.id, token)).toBe(true);

		// Check that we can't set the password without the token
		{
			const context = await execRequestC('', 'POST', path, {
				password: 'newpassword',
				password2: 'newpassword',
			});
			const sessionId = context.cookies.get('sessionId');
			expect(sessionId).toBeFalsy();
		}

		// Check that we can't set the password with someone else's token
		{
			const token2 = (await models().token().allByUserId(user2.id))[0].value;
			const context = await execRequestC('', 'POST', path, {
				password: 'newpassword',
				password2: 'newpassword',
				token: token2,
			});
			const sessionId = context.cookies.get('sessionId');
			expect(sessionId).toBeFalsy();
		}

		const context = await execRequestC('', 'POST', path, {
			password: 'newpassword',
			password2: 'newpassword',
			token: token,
		});

		// Check that the user has been logged in
		const sessionId = context.cookies.get('sessionId');
		const session = await models().session().load(sessionId);
		expect(session.user_id).toBe(user1.id);

		// Check that the password has been set
		const loggedInUser = await models().user().login(user1.email, 'newpassword');
		expect(loggedInUser.id).toBe(user1.id);

		// Check that the email has been verified
		expect(user1.email_confirmed).toBe(1);

		// Check that the token has been cleared
		expect(await models().token().isValid(user1.id, token)).toBe(false);

		// Check that a notification has been created
		const notification = (await models().notification().all())[0];
		expect(notification.key).toBe('passwordSet');
	});

	test('should allow user to verify their email', async function() {
		let user1 = await models().user().save({
			email: 'user1@localhost',
			must_set_password: 0,
			email_confirmed: 0,
			password: '123456',
		});

		const email = (await models().email().all()).find(e => e.recipient_id === user1.id);
		const matches = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
		const path = matches[1];
		const token = matches[3];

		const context = await execRequestC('', 'GET', path, null, { query: { token } });

		user1 = await models().user().load(user1.id);

		// Check that the user has been logged in
		const sessionId = context.cookies.get('sessionId');
		expect(sessionId).toBeFalsy();

		// Check that the email has been verified
		expect(user1.email_confirmed).toBe(1);

		// Check that the token has been cleared
		expect(await models().token().isValid(user1.id, token)).toBe(false);

		// Check that a notification has been created
		const notification = (await models().notification().all())[0];
		expect(notification.key).toBe(NotificationKey.EmailConfirmed);
	});

	test('should apply ACL', async function() {
		const { user: admin, session: adminSession } = await createUserAndSession(1, true);
		const { user: user1, session: session1 } = await createUserAndSession(2, false);

		// non-admin cannot list users
		await expectHttpError(async () => execRequest(session1.id, 'GET', 'users'), ErrorForbidden.httpCode);

		// non-admin user cannot view another user
		await expectHttpError(async () => execRequest(session1.id, 'GET', `users/${admin.id}`), ErrorForbidden.httpCode);

		// non-admin user cannot create a new user
		await expectHttpError(async () => postUser(session1.id, 'cantdothat@example.com', '123456'), ErrorForbidden.httpCode);

		// non-admin user cannot update another user
		await expectHttpError(async () => patchUser(session1.id, { id: admin.id, email: 'cantdothateither@example.com' }), ErrorForbidden.httpCode);

		// non-admin user cannot make themself an admin
		await expectHttpError(async () => patchUser(session1.id, { id: user1.id, is_admin: 1 }), ErrorForbidden.httpCode);

		// admin user cannot make themselves a non-admin
		await expectHttpError(async () => patchUser(adminSession.id, { id: admin.id, is_admin: 0 }), ErrorForbidden.httpCode);

		// only admins can delete users
		await expectHttpError(async () => execRequest(session1.id, 'POST', `users/${admin.id}`, { delete_button: true }), ErrorForbidden.httpCode);

		// cannot delete own user
		await expectHttpError(async () => execRequest(adminSession.id, 'POST', `users/${admin.id}`, { delete_button: true }), ErrorForbidden.httpCode);

		// non-admin cannot change max_item_size
		await expectHttpError(async () => patchUser(session1.id, { id: admin.id, max_item_size: 1000 }), ErrorForbidden.httpCode);
	});


});
