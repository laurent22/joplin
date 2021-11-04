import { User } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { NotificationKey } from '../../models/NotificationModel';
import { cookieGet } from '../../utils/cookies';
import { ErrorForbidden } from '../../utils/errors';
import { execRequest, execRequestC } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, parseHtml, checkContextError, expectHttpError, expectThrow } from '../../utils/testing/testUtils';
import uuidgen from '../../utils/uuidgen';

export async function postUser(sessionId: string, email: string, password: string = null, props: any = null): Promise<User> {
	password = password === null ? uuidgen() : password;

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

export async function patchUser(sessionId: string, user: any, url: string = ''): Promise<User> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: url ? url : '/users',
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

describe('index/users', function() {

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

		const password = uuidgen();
		await postUser(session.id, 'test@example.com', password, {
			max_item_size: '',
		});
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);
		expect(newUser.max_item_size).toBe(null);
		expect(newUser.must_set_password).toBe(0);

		const userModel = models().user();
		const userFromModel: User = await userModel.load(newUser.id);

		expect(!!userFromModel.password).toBe(true);
		expect(userFromModel.password === password).toBe(false); // Password has been hashed
	});

	test('should create a user with null properties if they are not explicitly set', async function() {
		const { session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com');
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(newUser.max_item_size).toBe(null);
		expect(newUser.can_share_folder).toBe(null);
		expect(newUser.can_share_note).toBe(null);
		expect(newUser.max_total_item_size).toBe(null);
	});

	test('should ask user to set password if not set on creation', async function() {
		const { session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com', '', {
			max_item_size: '',
		});
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(newUser.must_set_password).toBe(1);
		expect(!!newUser.password).toBe(true);
	});

	test('new user should be able to login', async function() {
		const { session } = await createUserAndSession(1, true);

		const password = uuidgen();
		await postUser(session.id, 'test@example.com', password);
		const loggedInUser = await models().user().login('test@example.com', password);
		expect(!!loggedInUser).toBe(true);
		expect(loggedInUser.email).toBe('test@example.com');
	});

	test('should format the email when saving it', async function() {
		const email = 'ILikeUppercaseAndSpaces@Example.COM   ';

		const { session } = await createUserAndSession(1, true);

		const password = uuidgen();
		await postUser(session.id, email, password);
		const loggedInUser = await models().user().login(email, password);
		expect(!!loggedInUser).toBe(true);
		expect(loggedInUser.email).toBe('ilikeuppercaseandspaces@example.com');
	});

	test('should not create anything if user creation fail', async function() {
		const { session } = await createUserAndSession(1, true);

		const userModel = models().user();

		const password = uuidgen();
		await postUser(session.id, 'test@example.com', password);

		const beforeUserCount = (await userModel.all()).length;
		expect(beforeUserCount).toBe(2);

		try {
			await postUser(session.id, 'test@example.com', password);
		} catch {
			// Ignore
		}

		const afterUserCount = (await userModel.all()).length;
		expect(beforeUserCount).toBe(afterUserCount);
	});

	test('should change user properties', async function() {
		const { user, session } = await createUserAndSession(1, false);

		const userModel = models().user();

		await patchUser(session.id, { id: user.id, full_name: 'new name' });
		const modUser: User = await userModel.load(user.id);
		expect(modUser.full_name).toBe('new name');
	});

	test('should change the password', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const userModel = models().user();

		const password = uuidgen();
		await patchUser(session.id, { id: user.id, password: password, password2: password });
		const modUser = await userModel.login('user1@localhost', password);
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
			password: uuidgen(),
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
			const newPassword = uuidgen();
			const context = await execRequestC('', 'POST', path, {
				password: newPassword,
				password2: newPassword,
			});
			const sessionId = cookieGet(context, 'sessionId');
			expect(sessionId).toBeFalsy();
		}

		// Check that we can't set the password with someone else's token
		{
			const newPassword = uuidgen();
			const token2 = (await models().token().allByUserId(user2.id))[0].value;
			const context = await execRequestC('', 'POST', path, {
				password: newPassword,
				password2: newPassword,
				token: token2,
			});
			const sessionId = cookieGet(context, 'sessionId');
			expect(sessionId).toBeFalsy();
		}

		const newPassword = uuidgen();

		const context = await execRequestC('', 'POST', path, {
			password: newPassword,
			password2: newPassword,
			token: token,
		});

		// Check that the user has been logged in
		const sessionId = cookieGet(context, 'sessionId');
		const session = await models().session().load(sessionId);
		expect(session.user_id).toBe(user1.id);

		// Check that the password has been set
		const loggedInUser = await models().user().login(user1.email, newPassword);
		expect(loggedInUser.id).toBe(user1.id);

		// Check that the email has been verified
		expect(user1.email_confirmed).toBe(1);

		// Check that the token has been cleared
		expect(await models().token().isValid(user1.id, token)).toBe(false);

		// Check that a notification has been created
		const notification = (await models().notification().all())[0];
		expect(notification.key).toBe('passwordSet');
	});

	test('should not confirm email if not requested', async function() {
		let user1 = await models().user().save({
			email: 'user1@localhost',
			must_set_password: 1,
			email_confirmed: 0,
			password: uuidgen(),
		});

		const email = (await models().email().all()).find(e => e.recipient_id === user1.id);
		const matches = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
		const path = matches[1];
		const token = matches[3];

		await execRequest('', 'GET', path, null, { query: { token, confirm_email: '0' } });

		// In this case, the email should not be confirmed, because
		// "confirm_email" is set to 0.
		user1 = await models().user().load(user1.id);
		expect(user1.email_confirmed).toBe(0);
	});

	test('should allow user to verify their email', async function() {
		let user1 = await models().user().save({
			email: 'user1@localhost',
			must_set_password: 0,
			email_confirmed: 0,
			password: uuidgen(),
		});

		const email = (await models().email().all()).find(e => e.recipient_id === user1.id);
		const [, path, , token] = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
		// const path = matches[1];
		// const token = matches[3];

		const context = await execRequestC('', 'GET', path, null, { query: { token } });

		user1 = await models().user().load(user1.id);

		// Check that the user has been logged in
		const sessionId = cookieGet(context, 'sessionId');
		expect(sessionId).toBeFalsy();

		// Check that the email has been verified
		expect(user1.email_confirmed).toBe(1);

		// Check that the token has been cleared
		expect(await models().token().isValid(user1.id, token)).toBe(false);

		// Check that a notification has been created
		const notification = (await models().notification().all())[0];
		expect(notification.key).toBe(NotificationKey.EmailConfirmed);
	});

	test('should allow changing an email', async function() {
		const { user, session } = await createUserAndSession();

		await patchUser(session.id, {
			id: user.id,
			email: 'changed@example.com',
		}, '/users/me');

		// It's not immediately changed
		expect((await models().user().load(user.id)).email).toBe('user1@localhost');

		// Grab the confirmation URL
		const email = (await models().email().all()).find(e => e.recipient_id === user.id);
		const [, path, , token] = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);

		await execRequest('', 'GET', path, null, { query: { token } });

		// Now that it's confirmed, it should have been changed
		expect((await models().user().load(user.id)).email).toBe('changed@example.com');

		const keys = await models().keyValue().all();
		expect(keys.length).toBe(1);
		expect(keys[0].value).toBe('user1@localhost'); // The old email has been saved

		await expectThrow(async () => execRequest('', 'GET', path, null, { query: { token } }));
	});

	test('should delete sessions when changing password', async function() {
		const { user, session, password } = await createUserAndSession(1);

		await models().session().authenticate(user.email, password);
		await models().session().authenticate(user.email, password);
		await models().session().authenticate(user.email, password);

		expect(await models().session().count()).toBe(4);

		await patchUser(session.id, {
			id: user.id,
			email: 'changed@example.com',
			password: 'hunter11hunter22hunter33',
			password2: 'hunter11hunter22hunter33',
		}, '/users/me');

		const sessions = await models().session().all();
		expect(sessions.length).toBe(1);
		expect(sessions[0].id).toBe(session.id);
	});

	test('should apply ACL', async function() {
		const { user: admin, session: adminSession } = await createUserAndSession(1, true);
		const { user: user1, session: session1 } = await createUserAndSession(2, false);

		// non-admin cannot list users
		await expectHttpError(async () => execRequest(session1.id, 'GET', 'users'), ErrorForbidden.httpCode);

		// non-admin user cannot view another user
		await expectHttpError(async () => execRequest(session1.id, 'GET', `users/${admin.id}`), ErrorForbidden.httpCode);

		// non-admin user cannot create a new user
		await expectHttpError(async () => postUser(session1.id, 'cantdothat@example.com'), ErrorForbidden.httpCode);

		// non-admin user cannot update another user
		await expectHttpError(async () => patchUser(session1.id, { id: admin.id, email: 'cantdothateither@example.com' }), ErrorForbidden.httpCode);

		// non-admin user cannot make themself an admin
		await expectHttpError(async () => patchUser(session1.id, { id: user1.id, is_admin: 1 }), ErrorForbidden.httpCode);

		// admin user cannot make themselves a non-admin
		await expectHttpError(async () => patchUser(adminSession.id, { id: admin.id, is_admin: 0 }), ErrorForbidden.httpCode);

		// only admins can delete users
		// Note: Disabled because the entire code is skipped if it's not an admin
		// await expectHttpError(async () => execRequest(session1.id, 'POST', `users/${admin.id}`, { disable_button: true }), ErrorForbidden.httpCode);

		// cannot delete own user
		await expectHttpError(async () => execRequest(adminSession.id, 'POST', `users/${admin.id}`, { disable_button: true }), ErrorForbidden.httpCode);

		// non-admin cannot change max_item_size
		await expectHttpError(async () => patchUser(session1.id, { id: user1.id, max_item_size: 1000 }), ErrorForbidden.httpCode);
		await expectHttpError(async () => patchUser(session1.id, { id: user1.id, max_total_item_size: 1000 }), ErrorForbidden.httpCode);

		// non-admin cannot change can_share_folder
		await models().user().save({ id: user1.id, can_share_folder: 0 });
		await expectHttpError(async () => patchUser(session1.id, { id: user1.id, can_share_folder: 1 }), ErrorForbidden.httpCode);

		// non-admin cannot change non-whitelisted properties
		await expectHttpError(async () => patchUser(session1.id, { id: user1.id, can_upload: 0 }), ErrorForbidden.httpCode);
	});


});
