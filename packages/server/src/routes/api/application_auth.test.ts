import { afterAllTests, beforeEachDb, models, createUserAndSession, beforeAllDb, createApplicationCredentials } from '../../utils/testing/testUtils';
import { getApi } from '../../utils/testing/apiUtils';
import { checkPassword } from '../../utils/auth';

describe('application_auth', () => {

	beforeAll(async () => {
		await beforeAllDb('application_auth');
	});


	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should return a password and a id if the user has authorized', async () => {

		const applicationAuthId = 'appAuthId';
		const { user } = await createUserAndSession(1, false);

		const response = await createApplicationCredentials(user.id, applicationAuthId);

		const applications = await models().application().all();
		expect(applications.length).toBe(1);

		const application = applications[0];
		expect(application.user_id).toBe(user.id);
		expect(application.password).not.toBeFalsy();

		expect(response.id).toBe(application.id);
		expect(await checkPassword(response.password, application.password)).toBe(true);
	});

	test('should throw an error if a invalid application_auth_id is sent to the API', async () => {

		const applicationAuthId = 'appAuthId';
		const { user } = await createUserAndSession(1, false);
		await models().application().createPreLoginRecord(
			applicationAuthId,
			'',
			undefined,
			undefined,
			undefined,
		);
		await models().application().onAuthorizeUse(applicationAuthId, user.id);

		await expect(
			getApi('', 'application_auth/asdf'),
		).rejects.toThrow('Application not authorized yet.');

		const applications = await models().application().all();
		expect(applications.length).toBe(1);

		const application = applications[0];
		expect(application.user_id).toBe(user.id);
		expect(application.password).toBe('');
	});

	test('should return an error message if application_auth_id is not a string', async () => {

		const applicationAuthId = 'appAuthId';
		const { user } = await createUserAndSession(1, false);
		await models().application().createPreLoginRecord(
			applicationAuthId,
			'',
			'',
			'0',
			'0',
		);
		await models().application().onAuthorizeUse(applicationAuthId, user.id);

		await expect(
			getApi('', 'application_auth/[asdf, asdf]'),
		).rejects.toThrow('Application not authorized yet.');

		const applications = await models().application().all();
		expect(applications.length).toBe(1);

		const application = applications[0];
		expect(application.user_id).toBe(user.id);
		expect(application.password).toBe('');
	});

	test('should return an error message if user has not authorized application use', async () => {

		const applicationAuthId = 'appAuthId';
		await createUserAndSession(1, false);
		await models().application().createPreLoginRecord(
			applicationAuthId,
			'',
			undefined,
			undefined,
			undefined,
		);

		await expect(
			getApi('', `application_auth/${applicationAuthId}`),
		).rejects.toThrow('Application not authorized yet.');
	});

});
