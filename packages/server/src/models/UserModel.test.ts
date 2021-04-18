import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createItem } from '../utils/testing/testUtils';
import { User } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../utils/errors';

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
		const { user: admin } = await createUserAndSession(1, true);
		const { user: user1 } = await createUserAndSession(2, false);
		const { user: user2 } = await createUserAndSession(3, false);

		let error = null;

		// Non-admin user can't create a user
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ email: 'newone@example.com', password: '1234546' }));
		expect(error instanceof ErrorForbidden).toBe(true);

		// Email must be set
		error = await checkThrowAsync(async () => await models().user({ userId: admin.id }).save({ email: '', password: '1234546' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// Password must be set
		error = await checkThrowAsync(async () => await models().user({ userId: admin.id }).save({ email: 'newone@example.com', password: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// non-admin user cannot modify another user
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ id: user2.id, email: 'newone@example.com' }));
		expect(error instanceof ErrorForbidden).toBe(true);

		// email must be set
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ id: user1.id, email: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// password must be set
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ id: user1.id, password: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// non-admin user cannot make a user an admin
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ id: user1.id, is_admin: 1 }));
		expect(error instanceof ErrorForbidden).toBe(true);

		// non-admin user cannot remove admin bit from themselves
		error = await checkThrowAsync(async () => await models().user({ userId: admin.id }).save({ id: admin.id, is_admin: 0 }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// there is already a user with this email
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ id: user1.id, email: user2.email }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		// check that the email is valid
		error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).save({ id: user1.id, email: 'ohno' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);
	});

	test('should delete a user', async function() {
		const { user: admin } = await createUserAndSession(1, true);
		const { session: session1, user: user1 } = await createUserAndSession(2, false);
		const { user: user2 } = await createUserAndSession(3, false);

		const userModel = models().user({ userId: admin.id });

		const allUsers: User[] = await userModel.all();
		const beforeCount: number = allUsers.length;

		await createItem(session1.id, 'root:/test.txt:', 'testing');

		// Can't delete someone else user
		const error = await checkThrowAsync(async () => await models().user({ userId: user1.id }).delete(user2.id));
		expect(error instanceof ErrorForbidden).toBe(true);
		expect((await userModel.all()).length).toBe(beforeCount);

		// Admin can delete any user
		expect(!!(await models().session().load(session1.id))).toBe(true);
		expect((await models().item().all()).length).toBe(1);
		expect((await models().userItem().all()).length).toBe(1);
		await models().user({ userId: admin.id }).delete(user1.id);
		expect((await userModel.all()).length).toBe(beforeCount - 1);
		expect(!!(await models().session().load(session1.id))).toBe(false);
		expect((await models().item().all()).length).toBe(0);
		expect((await models().userItem().all()).length).toBe(0);

		// Can delete own user
		await models().user({ userId: user2.id }).delete(user2.id);
		expect((await userModel.all()).length).toBe(beforeCount - 2);
	});

});
