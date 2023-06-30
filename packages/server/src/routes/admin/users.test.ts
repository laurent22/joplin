import { User } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { execRequest } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, checkContextError, expectHttpError } from '../../utils/testing/testUtils';
import uuidgen from '../../utils/uuidgen';
import { ErrorForbidden } from '../../utils/errors';

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
			url: url ? url : '/admin/users',
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

describe('admin/users', () => {

	beforeAll(async () => {
		await beforeAllDb('admin/users');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a new user', async () => {
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

	test('should create a user with null properties if they are not explicitly set', async () => {
		const { session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com');
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(newUser.max_item_size).toBe(null);
		expect(newUser.can_share_folder).toBe(null);
		expect(newUser.can_share_note).toBe(null);
		expect(newUser.max_total_item_size).toBe(null);
	});

	test('should ask user to set password if not set on creation', async () => {
		const { session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com', '', {
			max_item_size: '',
		});
		const newUser = await models().user().loadByEmail('test@example.com');

		expect(newUser.must_set_password).toBe(1);
		expect(!!newUser.password).toBe(true);
	});

	test('should format the email when saving it', async () => {
		const email = 'ILikeUppercaseAndSpaces@Example.COM   ';

		const { session } = await createUserAndSession(1, true);

		const password = uuidgen();
		await postUser(session.id, email, password);
		const loggedInUser = await models().user().login(email, password);
		expect(!!loggedInUser).toBe(true);
		expect(loggedInUser.email).toBe('ilikeuppercaseandspaces@example.com');
	});

	test('should not create anything if user creation fail', async () => {
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

	test('should list users', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1, true);
		const { user: user2 } = await createUserAndSession(2, false);

		const result = await execRequest(session1.id, 'GET', 'admin/users');
		expect(result).toContain(user1.email);
		expect(result).toContain(user2.email);
	});

	test('should delete sessions when changing password', async () => {
		const { user, session, password } = await createUserAndSession(1);

		await models().session().authenticate(user.email, password);
		await models().session().authenticate(user.email, password);
		await models().session().authenticate(user.email, password);

		expect(await models().session().count()).toBe(4);

		await patchUser(session.id, {
			id: user.id,
			email: 'changed@example.com',
			password: '111111',
			password2: '111111',
		}, '/admin/users/me');

		const sessions = await models().session().all();
		expect(sessions.length).toBe(1);
		expect(sessions[0].id).toBe(session.id);
	});

	test('should apply ACL', async () => {
		const { user: admin, session: adminSession } = await createUserAndSession(1, true);

		// admin user cannot make themselves a non-admin
		await expectHttpError(async () => patchUser(adminSession.id, { id: admin.id, is_admin: 0 }), ErrorForbidden.httpCode);

		// cannot delete own user
		await expectHttpError(async () => execRequest(adminSession.id, 'POST', `admin/users/${admin.id}`, { disable_button: true }), ErrorForbidden.httpCode);
	});

});
