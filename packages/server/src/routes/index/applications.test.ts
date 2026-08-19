import { ApplicationPlatform, ApplicationType } from '@joplin/lib/types';
import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, parseHtml, createUserAndSession, expectHttpError } from '../../utils/testing/testUtils';
import * as crypto from '../../utils/crypto';
import { AppContext } from '../../utils/types';
import { execRequest } from '../../utils/testing/apiUtils';
import { ErrorBadRequest, ErrorForbidden } from '../../utils/errors';

async function getApplicationConfirm(applicationAuthId: string, sessionId?: string): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'GET',
			url: `/applications/${applicationAuthId}/confirm`,
			query: {
				platform: ApplicationPlatform.Windows,
				type: ApplicationType.Desktop,
				version: 'v2.19.2',
			},
		},
		sessionId: sessionId,
		ip: '192.0.0.1',
	});

	await routeHandler(context);
	return context;
}

async function doApplicationConfirm(appAuthId: string, sessionId: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId,
		request: {
			method: 'POST',
			url: `/applications/${appAuthId}/confirm`,
			body: {
				applicationAuthId: appAuthId,
			},
		},
	});

	await routeHandler(context);
	return context;
}

describe('index/applications', () => {

	beforeAll(async () => {
		await beforeAllDb('index_applications');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should be able to confirm an application login', async () => {
		const { user, session } = await createUserAndSession(1);
		await models().user().save({ id: user.id });

		await getApplicationConfirm('asdf', session.id);
		await doApplicationConfirm('asdf', session.id);

		const applications = await models().application().all();

		expect(applications.length).toBe(1);
		expect(applications[0].user_id).toBe(user.id);
		expect(applications[0].last_access_time).toBe(0);
		expect(applications[0].password).toBe('');
	});

	test('should not override values if confirmation already happened and show error message', async () => {
		const { user, session } = await createUserAndSession(1);
		await models().user().save({ id: user.id });

		await getApplicationConfirm('asdf', session.id);
		await doApplicationConfirm('asdf', session.id);

		// Confirm again
		const [applicationBefore] = await models().application().all();
		const context2 = await doApplicationConfirm('asdf', session.id);
		const [applicationAfter] = await models().application().all();

		const doc = parseHtml(context2.response.body as string);
		const alertNode = doc.querySelector('div.notification.is-danger');

		expect(alertNode.textContent.trim()).toBe('Application Auth Id has already been used, go back to the Joplin application to finish the login process: asdf');
		expect(applicationBefore).toEqual(applicationAfter);
	});

	test('should create a pre login record in applications', async () => {
		const { user, session } = await createUserAndSession(1);
		await models().user().save({ id: user.id, totp_secret: 'totp_secret' });

		const checkCode = jest.spyOn(crypto, 'isValidMFACode');
		checkCode.mockReturnValue(true);

		await getApplicationConfirm('asdf', session.id);

		const applicationAuthIdInformation = await models().keyValue().value<string>('ApplicationAuthId::asdf');
		const ulcInfo = JSON.parse(applicationAuthIdInformation);

		expect(ulcInfo.ip).toBe('192.0.0.1');
		expect(ulcInfo.platform).toBe(ApplicationPlatform.Windows);
		expect(ulcInfo.type).toBe(ApplicationType.Desktop);
		expect(ulcInfo.version).toBe('v2.19.2');
	});

	test('should throw Forbidden error if user is not logged in', async () => {
		const { user, session } = await createUserAndSession(1);
		await models().user().save({ id: user.id });

		await getApplicationConfirm('asdf', session.id);
		await models().session().delete(session.id);

		await expectHttpError(async () => execRequest(session.id, 'POST', 'applications/asdf/confirm', { applicationAuthId: 'asdf2' }, null), ErrorForbidden.httpCode);
	});

	test('should throw Bad Request if application auth id does not exist', async () => {
		const { user, session } = await createUserAndSession(1);
		await models().user().save({ id: user.id });

		await getApplicationConfirm('asdf', session.id);
		await expectHttpError(async () => execRequest(session.id, 'POST', 'applications/asdf2/confirm', { applicationAuthId: 'asdf2' }, null), ErrorBadRequest.httpCode);
		const context = await doApplicationConfirm('asdf2', session.id);
		const doc = parseHtml(context.response.body as string);
		const alertNode = doc.querySelector('div.notification.is-danger');

		expect(alertNode.textContent.trim()).toBe('Check if you are not already logged in on your Joplin application, client associated with this application auth id not found: asdf2');
	});
});
