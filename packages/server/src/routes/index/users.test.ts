import { User } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { NotificationKey } from '../../models/NotificationModel';
import { cookieGet } from '../../utils/cookies';
import { ErrorForbidden } from '../../utils/errors';
import { execRequest, execRequestC } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, parseHtml, checkContextError, expectHttpError, expectThrow } from '../../utils/testing/testUtils';
import uuidgen from '../../utils/uuidgen';

async function postUser(sessionId: string, email: string, password: string = null, props: any = null): Promise<User> {
	password = password === null ? uuidgen() : password;

	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: '/admin/users/new',
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

async function patchUser(sessionId: string, user: any, url = ''): Promise<User> {
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

async function getUserHtml(sessionId: string, userId: string): Promise<string> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'GET',
			url: `/users/${userId}`,
		},
	});

	await routeHandler(context);
	checkContextError(context);
	return context.response.body as string;
}

describe('index/users', () => {

	beforeAll(async () => {
		await beforeAllDb('index_users');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('new user should be able to login', async () => {
		const { session } = await createUserAndSession(1, true);

		const password = uuidgen();
		await postUser(session.id, 'test@example.com', password);
		const loggedInUser = await models().user().login('test@example.com', password);
		expect(!!loggedInUser).toBe(true);
		expect(loggedInUser.email).toBe('test@example.com');
	});

	test('should change user properties', async () => {
		const { user, session } = await createUserAndSession(1, false);

		const userModel = models().user();

		await patchUser(session.id, { id: user.id, full_name: 'new name' });
		const modUser: User = await userModel.load(user.id);
		expect(modUser.full_name).toBe('new name');
	});

	test('should change the password', async () => {
		const { user, session } = await createUserAndSession(1, true);

		const userModel = models().user();

		const password = uuidgen();
		await patchUser(session.id, { id: user.id, password: password, password2: password });
		const modUser = await userModel.login('user1@localhost', password);
		expect(!!modUser).toBe(true);
		expect(modUser.id).toBe(user.id);
	});

	test('should get a user', async () => {
		const { user, session } = await createUserAndSession();

		const userHtml = await getUserHtml(session.id, user.id);
		const doc = parseHtml(userHtml);

		// <input class="input" type="email" name="email" value="user1@localhost"/>
		expect((doc.querySelector('input[name=email]') as any).value).toBe('user1@localhost');
	});

	test('should allow user to set a password for new accounts', async () => {
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

	test('should not confirm email if not requested', async () => {
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

	test('should allow user to verify their email', async () => {
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

	test('should allow changing an email', async () => {
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

	test('should not change non-whitelisted properties', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(2, false);

		await patchUser(session1.id, {
			id: user1.id,
			is_admin: 1,
			max_item_size: 555,
			max_total_item_size: 5555,
			can_share_folder: 1,
			can_upload: 0,
		});
		const reloadedUser1 = await models().user().load(user1.id);
		expect(reloadedUser1.is_admin).toBe(0);
		expect(reloadedUser1.max_item_size).toBe(null);
		expect(reloadedUser1.max_total_item_size).toBe(null);
		expect(reloadedUser1.can_share_folder).toBe(null);
		expect(reloadedUser1.can_upload).toBe(1);
	});

	test('should apply ACL', async () => {
		const { user: admin } = await createUserAndSession(1, true);
		const { session: session1 } = await createUserAndSession(2, false);

		// non-admin cannot list users
		await expectHttpError(async () => execRequest(session1.id, 'GET', 'admin/users'), ErrorForbidden.httpCode);

		// non-admin user cannot view another user
		await expectHttpError(async () => execRequest(session1.id, 'GET', `users/${admin.id}`), ErrorForbidden.httpCode);

		// non-admin user cannot create a new user
		await expectHttpError(async () => postUser(session1.id, 'cantdothat@example.com'), ErrorForbidden.httpCode);

		// non-admin user cannot update another user
		await expectHttpError(async () => patchUser(session1.id, { id: admin.id, email: 'cantdothateither@example.com' }), ErrorForbidden.httpCode);
	});


});
