import { File, User } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { checkContextError } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, parseHtml } from '../../utils/testing/testUtils';

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

	test('should create a new user along with his root file', async function() {
		const { user: admin, session } = await createUserAndSession(1, true);

		await postUser(session.id, 'test@example.com', '123456');
		const newUser = await models().user({ userId: admin.id }).loadByEmail('test@example.com');

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);

		const userModel = models().user({ userId: newUser.id });
		const userFromModel: User = await userModel.load(newUser.id);

		expect(!!userFromModel.password).toBe(true);
		expect(userFromModel.password === '123456').toBe(false); // Password has been hashed

		const fileModel = models().file({ userId: newUser.id });
		const rootFile: File = await fileModel.userRootFile();

		expect(!!rootFile).toBe(true);
		expect(!!rootFile.id).toBe(true);
	});

	test('should not create anything, neither user, root file nor permissions, if user creation fail', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileModel = models().file({ userId: user.id });
		const permissionModel = models().permission();
		const userModel = models().user({ userId: user.id });

		await postUser(session.id, 'test@example.com', '123456');

		const beforeFileCount = (await fileModel.all()).length;
		const beforeUserCount = (await userModel.all()).length;
		const beforePermissionCount = (await permissionModel.all()).length;

		expect(beforeFileCount).toBe(2);
		expect(beforeUserCount).toBe(2);

		await postUser(session.id, 'test@example.com', '123456');

		const afterFileCount = (await fileModel.all()).length;
		const afterUserCount = (await userModel.all()).length;
		const afterPermissionCount = (await permissionModel.all()).length;

		expect(beforeFileCount).toBe(afterFileCount);
		expect(beforeUserCount).toBe(afterUserCount);
		expect(beforePermissionCount).toBe(afterPermissionCount);
	});

	test('should change user properties', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const userModel = models().user({ userId: user.id });

		await patchUser(session.id, { id: user.id, email: 'test2@example.com' });
		const modUser: User = await userModel.load(user.id);
		expect(modUser.email).toBe('test2@example.com');
	});

	test('should change the password', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const userModel = models().user({ userId: user.id });

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

});
