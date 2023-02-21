import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, expectHttpError } from '../../utils/testing/testUtils';
import { execRequest } from '../../utils/testing/apiUtils';
import uuidgen from '../../utils/uuidgen';
import { ErrorNotFound } from '../../utils/errors';

describe('index/password', () => {

	beforeAll(async () => {
		await beforeAllDb('index/password');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should queue an email to reset password', async () => {
		const { user, password } = await createUserAndSession(1);

		// Create a few sessions, to verify that they are all deleted when the
		// password is changed.
		await models().session().authenticate(user.email, password);
		await models().session().authenticate(user.email, password);
		await models().session().authenticate(user.email, password);
		expect(await models().session().count()).toBe(4);

		await models().email().deleteAll();
		await execRequest('', 'POST', 'password/forgot', { email: user.email });
		const emails = await models().email().all();
		expect(emails.length).toBe(1);
		const match = emails[0].body.match(/(password\/reset)\?token=(.{32})/);
		expect(match).toBeTruthy();

		const newPassword = uuidgen();
		await execRequest('', 'POST', match[1], {
			password: newPassword,
			password2: newPassword,
		}, { query: { token: match[2] } });

		const loggedInUser = await models().user().login(user.email, newPassword);
		expect(loggedInUser.id).toBe(user.id);

		// Check that all sessions have been deleted
		expect(await models().session().count()).toBe(0);
	});

	test('should not queue an email for non-existing emails', async () => {
		await createUserAndSession(1);
		await models().email().deleteAll();
		await execRequest('', 'POST', 'password/forgot', { email: 'justtryingtohackdontmindme@example.com' });
		expect((await models().email().all()).length).toBe(0);
	});

	test('should not reset the password if the token is invalid', async () => {
		const { user } = await createUserAndSession(1);
		await models().email().deleteAll();

		const newPassword = uuidgen();

		await expectHttpError(async () => {
			await execRequest('', 'POST', 'password/reset', {
				password: newPassword,
				password2: newPassword,
			}, { query: { token: 'stilltryingtohack' } });
		}, ErrorNotFound.httpCode);

		const loggedInUser = await models().user().login(user.email, newPassword);
		expect(loggedInUser).toBeFalsy();
	});

});
