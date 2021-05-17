import { User } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { ErrorForbidden } from '../../utils/errors';
import { execRequest } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, parseHtml, checkContextError, expectHttpError } from '../../utils/testing/testUtils';

export async function postUser(sessionId: string, email: string, password: string): Promise<User> {
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

		await postUser(session.id, 'test@example.com', '123456');
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);

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

		await postUser(session.id, 'test@example.com', '123456');

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

		// non-admin cannot change item_max_size
		await expectHttpError(async () => patchUser(session1.id, { id: admin.id, item_max_size: 1000 }), ErrorForbidden.httpCode);
	});


});
