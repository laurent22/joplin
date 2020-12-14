import { models, controllers, createUserAndSession, checkThrowAsync, beforeAllDb, afterAllDb, beforeEachDb } from '../../utils/testUtils';
import { File, User } from '../../db';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../../utils/errors';

describe('UserController', function() {

	beforeAll(async () => {
		await beforeAllDb('UserController');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	it('should create a new user along with his root file', async function() {
		const { session } = await createUserAndSession(1, true);

		const controller = controllers().apiUser();

		const newUser = await controller.postUser(session.id, { email: 'test@example.com', password: '123456' });

		expect(!!newUser).toBe(true);
		expect(!!newUser.id).toBe(true);
		expect(!!newUser.is_admin).toBe(false);
		expect(!!newUser.email).toBe(true);
		expect(!newUser.password).toBe(true);

		const userModel = models().user({ userId: newUser.id });
		const userFromModel: User = await userModel.load(newUser.id);

		expect(!!userFromModel.password).toBe(true);
		expect(userFromModel.password === '123456').toBe(false); // Password has been hashed

		const fileModel = models().file({ userId: newUser.id });
		const rootFile: File = await fileModel.userRootFile();

		expect(!!rootFile).toBe(true);
		expect(!!rootFile.id).toBe(true);
	});

	it('should not create anything, neither user, root file nor permissions, if user creation fail', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const controller = controllers().apiUser();
		const fileModel = models().file({ userId: user.id });
		const permissionModel = models().permission();
		const userModel = models().user({ userId: user.id });

		await controller.postUser(session.id, { email: 'test@example.com', password: '123456' });

		const beforeFileCount = (await fileModel.all()).length;
		const beforeUserCount = (await userModel.all()).length;
		const beforePermissionCount = (await permissionModel.all()).length;

		expect(beforeFileCount).toBe(2);
		expect(beforeUserCount).toBe(2);

		let hasThrown = false;
		try {
			await controller.postUser(session.id, { email: 'test@example.com', password: '123456' });
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);

		const afterFileCount = (await fileModel.all()).length;
		const afterUserCount = (await userModel.all()).length;
		const afterPermissionCount = (await permissionModel.all()).length;

		expect(beforeFileCount).toBe(afterFileCount);
		expect(beforeUserCount).toBe(afterUserCount);
		expect(beforePermissionCount).toBe(afterPermissionCount);
	});

	it('should change user properties', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const controller = controllers().apiUser();
		const userModel = models().user({ userId: user.id });

		await controller.patchUser(session.id, { id: user.id, email: 'test2@example.com' });
		let modUser: User = await userModel.load(user.id);
		expect(modUser.email).toBe('test2@example.com');

		const previousPassword = modUser.password;
		await controller.patchUser(session.id, { id: user.id, password: 'abcdefgh' });
		modUser = await userModel.load(user.id);
		expect(!!modUser.password).toBe(true);
		expect(modUser.password === previousPassword).toBe(false);
	});

	it('should get a user', async function() {
		const { user, session } = await createUserAndSession();

		const controller = controllers().apiUser();
		const gotUser = await controller.getUser(session.id, user.id);

		expect(gotUser.id).toBe(user.id);
		expect(gotUser.email).toBe(user.email);
	});

	it('should validate user objects', async function() {
		const { user: admin, session: adminSession } = await createUserAndSession(1, true);
		const { user: user1, session: userSession1 } = await createUserAndSession(2, false);
		const { user: user2 } = await createUserAndSession(3, false);

		let error = null;
		const controller = controllers().apiUser();

		// Non-admin user can't create a user
		error = await checkThrowAsync(async () => await controller.postUser(userSession1.id, { email: 'newone@example.com', password: '1234546' }));
		expect(error instanceof ErrorForbidden).toBe(true);

		// Email must be set
		error = await checkThrowAsync(async () => await controller.postUser(adminSession.id, { email: '', password: '1234546' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// Password must be set
		error = await checkThrowAsync(async () => await controller.postUser(adminSession.id, { email: 'newone@example.com', password: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// ID must be set when updating a user
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { email: 'newone@example.com' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// non-admin user cannot modify another user
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { id: user2.id, email: 'newone@example.com' }));
		expect(error instanceof ErrorForbidden).toBe(true);

		// email must be set
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { id: user1.id, email: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// password must be set
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { id: user1.id, password: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// non-admin user cannot make a user an admin
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { id: user1.id, is_admin: 1 }));
		expect(error instanceof ErrorForbidden).toBe(true);

		// non-admin user cannot remove admin bit from themselves
		error = await checkThrowAsync(async () => await controller.patchUser(adminSession.id, { id: admin.id, is_admin: 0 }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// there is already a user with this email
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { id: user1.id, email: user2.email }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// check that the email is valid
		error = await checkThrowAsync(async () => await controller.patchUser(userSession1.id, { id: user1.id, email: 'ohno' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);
	});

	it('should delete a user', async function() {
		const { user: admin, session: adminSession } = await createUserAndSession(1, true);
		const { user: user1, session: session1 } = await createUserAndSession(2, false);
		const { user: user2, session: session2 } = await createUserAndSession(3, false);

		const controller = controllers().apiUser();
		const userModel = models().user({ userId: admin.id });

		const allUsers: File[] = await userModel.all();
		const beforeCount: number = allUsers.length;

		// Can't delete someone else user
		const error = await checkThrowAsync(async () => await controller.deleteUser(session1.id, user2.id));
		expect(error instanceof ErrorForbidden).toBe(true);
		expect((await userModel.all()).length).toBe(beforeCount);

		// Admin can delete any user
		await controller.deleteUser(adminSession.id, user1.id);
		expect((await userModel.all()).length).toBe(beforeCount - 1);
		const allFiles = await models().file().all() as File[];
		expect(allFiles.length).toBe(2);
		expect(!!allFiles.find(f => f.owner_id === admin.id)).toBe(true);
		expect(!!allFiles.find(f => f.owner_id === user2.id)).toBe(true);

		// Can delete own user
		const fileModel = models().file({ userId: user2.id });
		expect(!!(await fileModel.userRootFile())).toBe(true);
		await controller.deleteUser(session2.id, user2.id);
		expect((await userModel.all()).length).toBe(beforeCount - 2);
		expect(!!(await fileModel.userRootFile())).toBe(false);
	});

});
