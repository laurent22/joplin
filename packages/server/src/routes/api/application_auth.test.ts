import { afterAllTests, beforeEachDb, models, createUserAndSession, beforeAllDb, createApplicationCredentials, koaAppContext } from '../../utils/testing/testUtils';
import { getApi } from '../../utils/testing/apiUtils';
import { checkPassword } from '../../utils/auth';
import routeHandler from '../../middleware/routeHandler';
import { ApplicationPlatform, ApplicationType } from '@joplin/lib/types';

const browserIp = '198.51.100.20';
const deviceIp = '203.0.113.7';

const signInEmails = async () => (await models().email().all()).filter(e => e.subject.includes('New sign-in'));

const authoriseApplication = async (applicationAuthId: string, version: string) => {
	const { user } = await createUserAndSession(1, false);
	await models().application().createPreLoginRecord(applicationAuthId, browserIp, version, ApplicationPlatform.Linux.toString(), ApplicationType.Desktop.toString());
	await models().application().onAuthorizeUse(applicationAuthId, user.id);
	return user;
};

const collectCredentials = async (applicationAuthId: string) => {
	const context = await koaAppContext({
		request: {
			method: 'GET',
			url: `/api/application_auth/${applicationAuthId}`,
			headers: { 'x-real-ip': deviceIp },
		},
	});
	await routeHandler(context);
};

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

	test.each([
		['3.7.21', '3.7.21'],
		['evil.com', 'Unknown'],
		['3.7.21.evil.com', 'Unknown'],
	])('should email the owner with the IP of the device once it has collected its credentials (version: %s)', async (version, expectedVersion) => {
		const user = await authoriseApplication('appAuthId', version);
		expect(await signInEmails()).toHaveLength(0);

		await collectCredentials('appAuthId');

		const [application] = await models().application().all();
		expect(application.ip).toBe(deviceIp);

		const emails = await signInEmails();
		expect(emails).toHaveLength(1);
		expect(emails[0].recipient_id).toBe(user.id);
		expect(emails[0].body).toContain(`Desktop application (Linux, version ${expectedVersion})`);
		expect(emails[0].body).not.toContain('evil.com');
		expect(emails[0].body).toContain(deviceIp);
		expect(emails[0].body).not.toContain(browserIp);
		expect(emails[0].body).not.toContain('http');

		await collectCredentials('appAuthId');
		expect(await signInEmails()).toHaveLength(1);
	});

});
