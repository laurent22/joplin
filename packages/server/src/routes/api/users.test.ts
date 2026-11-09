import { User } from '../../services/database/types';
import { deleteApi, getApi, patchApi, postApi } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, expectHttpError, expectThrow, koaAppContext } from '../../utils/testing/testUtils';
import ownerHandler from '../../middleware/ownerHandler';
import { ErrorForbidden, ErrorTooManyRequests, ErrorUnprocessableEntity } from '../../utils/errors';
import { uuidgen } from '@joplin/lib/uuid';

describe('api/users', () => {

	beforeAll(async () => {
		await beforeAllDb('api_users');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test.each([
		['an API request with the X-API-AUTH header', '/api/users/me', true, true],
		['an API request with only the session cookie', '/api/users/me', false, false],
		['a web request with only the session cookie', '/home', false, true],
	])('should resolve the session for %s', async (_case, url, withHeader, expectOwner) => {
		const { session } = await createUserAndSession(1);
		const context = await koaAppContext({ sessionId: session.id, request: { method: 'GET', url } });
		if (!withHeader) delete context.headers['x-api-auth'];
		context.joplin.owner = null;

		await ownerHandler(context, async () => {});
		expect(!!context.joplin.owner).toBe(expectOwner);
	});

	test('should create a user', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);

		const userToSave: User = {
			full_name: 'Toto',
			email: 'toto@example.com',
			max_item_size: 1000,
			can_share_folder: 0,
		};

		await postApi(adminSession.id, 'users', userToSave);

		const savedUser = await models().user().loadByEmail('toto@example.com');
		expect(savedUser.full_name).toBe('Toto');
		expect(savedUser.email).toBe('toto@example.com');
		expect(savedUser.can_share_folder).toBe(0);
		expect(savedUser.max_item_size).toBe(1000);
		expect(savedUser.email_confirmed).toBe(0);
		expect(savedUser.must_set_password).toBe(1);
	});

	test('should patch a user', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		await patchApi(adminSession.id, `users/${user.id}`, {
			max_item_size: 1000,
		});

		const savedUser = await models().user().load(user.id);
		expect(savedUser.max_item_size).toBe(1000);
	});

	test('should get a user', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		const fetchedUser: User = await getApi(adminSession.id, `users/${user.id}`);

		expect(fetchedUser.id).toBe(user.id);
		expect(fetchedUser.email).toBe(user.email);
	});

	test('should only give the public key of a user to a logged in user', async () => {
		const { session } = await createUserAndSession(1);
		const path = `users/${encodeURIComponent('someone@example.com')}/public_key`;

		await expectHttpError(async () => getApi('', path), ErrorForbidden.httpCode);
		expect(await getApi(session.id, path)).toBe('');
	});

	test('should delete a user', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		await deleteApi(adminSession.id, `users/${user.id}`);

		const loadedUser = await models().user().load(user.id);
		expect(loadedUser).toBeFalsy();
	});

	test('should list users', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);
		await createUserAndSession(2);
		await createUserAndSession(3);

		const results = await getApi<{ items: User[] }>(adminSession.id, 'users');
		expect(results.items.length).toBe(3);
	});


	test('should not return password hash', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		const fetchedUser: User = await getApi(adminSession.id, `users/${user.id}`);

		expect(fetchedUser.password).toBeUndefined();
	});
	test('should not allow changing non-whitelisted properties', async () => {
		const { session, user } = await createUserAndSession(1, false);
		expect(user.is_admin).toBe(0);

		await expectHttpError(async () => patchApi(session.id, `users/${user.id}`, {
			is_admin: 1,
		}), ErrorForbidden.httpCode);

		const reloadedUser = await models().user().load(user.id);
		expect(reloadedUser.is_admin).toBe(0);
	});

	test('should allow changing whitelisted properties', async () => {
		const { session, user } = await createUserAndSession(1, false);
		expect(user.is_admin).toBe(0);

		await patchApi(session.id, `users/${user.id}`, {
			full_name: 'New Name',
		});

		const reloadedUser = await models().user().load(user.id);
		expect(reloadedUser.full_name).toBe('New Name');
	});

	test('should only change the password with the current password, and revoke other sessions', async () => {
		const { session, user, password } = await createUserAndSession(1, false);
		const otherSession = await models().session().createUserSession(user.id);
		const newPassword = uuidgen();

		await expectHttpError(async () => patchApi(session.id, `users/${user.id}`, { password: newPassword }), ErrorUnprocessableEntity.httpCode);
		expect(await models().user().isPasswordValid(user.id, newPassword)).toBe(false);

		await patchApi(session.id, `users/${user.id}`, { password: newPassword, current_password: password });
		expect(await models().user().isPasswordValid(user.id, newPassword)).toBe(true);
		expect(await models().session().load(otherSession.id)).toBeFalsy();
		expect(await models().session().load(session.id)).toBeTruthy();
	});

	test('should not change the email of a non-admin until it is confirmed', async () => {
		const { session, user, password } = await createUserAndSession(1, false);

		await expectHttpError(async () => patchApi(session.id, `users/${user.id}`, { email: 'new-email@example.com' }), ErrorUnprocessableEntity.httpCode);

		await patchApi(session.id, `users/${user.id}`, {
			email: 'new-email@example.com',
			full_name: 'New Name',
			current_password: password,
		});

		// The address is only stored as pending, and the other properties are
		// still saved.
		const reloadedUser = await models().user().load(user.id);
		expect(reloadedUser.email).toBe(user.email);
		expect(reloadedUser.full_name).toBe('New Name');
		expect(await models().keyValue().value(`newEmail::${user.id}`)).toBe('new-email@example.com');

		// The new address is asked to confirm, and the previous one is told
		// about the change.
		const emails = await models().email().all();
		expect(emails.find(e => e.recipient_email === 'new-email@example.com')).toBeTruthy();
		expect(emails.find(e => e.recipient_email === user.email)).toBeTruthy();
	});

	test.each([
		'first@example.com, second@example.com',
		'first@example.com;second@example.com',
		'first@example.com second@example.com',
		'Name <first@example.com>',
		`${'a'.repeat(250)}@example.com`,
	])('should refuse to change the email to %s before saving anything', async (email) => {
		const { session, user, password } = await createUserAndSession(1, false);

		await expectHttpError(async () => patchApi(session.id, `users/${user.id}`, {
			email,
			full_name: 'New Name',
			current_password: password,
		}), ErrorUnprocessableEntity.httpCode);

		expect((await models().user().load(user.id)).full_name).not.toBe('New Name');
		expect(await models().keyValue().value(`newEmail::${user.id}`)).toBeFalsy();
		expect((await models().email().all()).filter(e => e.recipient_email !== user.email)).toEqual([]);
	});

	test('should limit the number of email changes', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS = '1';

		try {
			const { session, user, password } = await createUserAndSession(1, false);
			const changeEmail = async (index: number) => patchApi(session.id, `users/${user.id}`, { email: `new-email-${index}@example.com`, current_password: password });

			// Attempts with a wrong current password are not counted
			for (let i = 0; i < 3; i++) {
				await expectThrow(async () => patchApi(session.id, `users/${user.id}`, { email: `typo-${i}@example.com`, current_password: 'wrong-password' }));
			}

			for (let i = 0; i < 3; i++) await changeEmail(i);
			await expectHttpError(async () => changeEmail(3), ErrorTooManyRequests.httpCode);
		} finally {
			delete process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS;
		}
	});

	test('should let an admin change an email directly', async () => {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		await patchApi(adminSession.id, `users/${user.id}`, {
			email: 'new-email@example.com',
		});

		const reloadedUser = await models().user().load(user.id);
		expect(reloadedUser.email).toBe('new-email@example.com');
		expect(await models().keyValue().value(`newEmail::${user.id}`)).toBeFalsy();
	});

});
