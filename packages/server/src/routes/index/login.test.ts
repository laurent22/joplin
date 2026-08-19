import { Session } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { cookieDelete, cookieGet } from '../../utils/cookies';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models, parseHtml, createUser } from '../../utils/testing/testUtils';
import { AppContext } from '../../utils/types';
import * as crypto from '../../utils/crypto';

async function doLogin(email: string, password: string): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'POST',
			url: '/login',
			body: {
				email: email,
				password: password,
			},
		},
	});

	await routeHandler(context);
	return context;
}

async function doLoginWithMFA(email: string, password: string, mfaCode: string, applicationAuthId?: string, recoveryCode?: string): Promise<AppContext> {
	const context = await koaAppContext({
		request: {
			method: 'POST',
			url: '/login',
			body: {
				email: email,
				password: password,
				mfaCode: mfaCode,
				applicationAuthId,
				recoveryCode: recoveryCode,
			},
		},
	});

	await routeHandler(context);
	return context;
}

describe('index_login', () => {

	beforeAll(async () => {
		await beforeAllDb('index_login', {
			envValues: {
				MFA_ENCRYPTION_KEY: 'b73e50cd8970ed5eefb980d860c8406eb8f6519a90ce9c8f9f2b2b73661a5ab21',
			},
		});
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should show the login page', async () => {
		const context = await koaAppContext({
			request: {
				method: 'GET',
				url: '/login',
			},
		});

		await routeHandler(context);

		const doc = parseHtml(context.response.body as string);
		expect(!!doc.querySelector('input[name=email]')).toBe(true);
		expect(!!doc.querySelector('input[name=password]')).toBe(true);
	});

	test('should login', async () => {
		const user = await createUser(1);

		const context = await doLogin(user.email, '123456');
		const sessionId = cookieGet(context, 'sessionId');
		const session: Session = await models().session().load(sessionId);
		expect(session.user_id).toBe(user.id);
	});

	test('should not login with invalid credentials', async () => {
		const user = await createUser(1);

		{
			const context = await doLogin('bad', '123456');
			expect(!cookieGet(context, 'sessionId')).toBe(true);
		}

		{
			const context = await doLogin(user.email, 'bad');
			expect(!cookieGet(context, 'sessionId')).toBe(true);
		}
	});

	test('should redirect if already logged in', async () => {
		const user = await createUser(1);

		const context = await doLogin(user.email, '123456');
		const sessionId = cookieGet(context, 'sessionId');

		const getContext = await koaAppContext({
			sessionId: sessionId,
			request: {
				method: 'GET',
				url: '/login',
			},
		});

		await routeHandler(getContext);

		expect(getContext.response.status).toBe(302);
	});

	test('should not redirect if sessionId is not valid', async () => {

		const getContext = await koaAppContext({
			sessionId: 'no-sense',
			request: {
				method: 'GET',
				url: '/login',
			},
		});

		await routeHandler(getContext);

		expect(getContext.response.status).toBe(200);
	});

	test('should not be able to login with credentials if has MFA enabled', async () => {
		const user = await createUser(1);
		await models().user().save({ id: user.id, totp_secret: 'totp_secret' });

		const context = await doLogin(user.email, '123456');
		const sessionId = cookieGet(context, 'sessionId');

		expect(sessionId).toBe(undefined);
	});

	test('should show mfa input field if user tries to login but has MFA enabled', async () => {
		const user = await createUser(1);
		await models().user().save({ id: user.id, totp_secret: 'totp_secret' });

		const context = await doLogin(user.email, '123456');

		expect(context.response.body.toString().includes('<label class="label">Authentication code</label>')).toBe(true);
	});

	test('should populate the email and password input fields with sent values if user has MFA enabled', async () => {
		const user = await createUser(1);
		await models().user().save({ id: user.id, totp_secret: 'totp_secret' });

		const context = await doLogin(user.email, '123456');

		expect(context.response.body.toString().includes('<input class="input" type="password" name="password" value="123456"/>')).toBe(true);
		expect(context.response.body.toString().includes('<input class="input" type="email" name="email" value="user1@localhost"/>')).toBe(true);
	});

	test('should be able to login with MFA enabled if MFA code is valid', async () => {
		const user = await createUser(1);
		await models().user().save({ id: user.id, totp_secret: 'totp_secret' });

		const checkCode = jest.spyOn(crypto, 'isValidMFACode');
		checkCode.mockReturnValue(true);

		const context = await doLoginWithMFA(user.email, '123456', '654321');

		const sessionId = cookieGet(context, 'sessionId');
		const session: Session = await models().session().load(sessionId);
		expect(session.user_id).toBe(user.id);
	});

	test('should not be able to login with MFA enabled if MFA code is not valid', async () => {
		const user = await createUser(1);
		await models().user().save({ id: user.id, totp_secret: 'totp_secret' });

		const checkCode = jest.spyOn(crypto, 'isValidMFACode');
		checkCode.mockReturnValue(false);

		const context = await doLoginWithMFA(user.email, '123456', '654321');

		const sessionId = cookieGet(context, 'sessionId');
		expect(sessionId).toBe(undefined);
	});

	test('should be able to login using recovery code if MFA is enabled', async () => {
		const user = await createUser(1);
		await models().user().enableMFA(user.id, 'asdf', '');
		const recoveryCodes = await models().recoveryCode().loadByUserId(user.id);

		const context = await doLoginWithMFA(user.email, '123456', undefined, undefined, recoveryCodes[0].code);

		const sessionId = cookieGet(context, 'sessionId');
		const session: Session = await models().session().load(sessionId);
		expect(session.user_id).toBe(user.id);
	});

	test('should not be able to login using recovery code if the code has already been used', async () => {
		const user = await createUser(1);
		await models().user().enableMFA(user.id, 'asdf', '');
		const recoveryCodes = await models().recoveryCode().loadByUserId(user.id);

		const context = await doLoginWithMFA(user.email, '123456', undefined, undefined, recoveryCodes[0].code);
		cookieDelete(context, 'sessionId');
		const context2 = await doLoginWithMFA(user.email, '123456', undefined, undefined, recoveryCodes[0].code);

		const sessionId = cookieGet(context2, 'sessionId');
		expect(sessionId).toBe(undefined);
	});

	test('should show the login page with recovery code input', async () => {
		const context = await koaAppContext({
			request: {
				method: 'GET',
				url: '/login',
				query: {
					showRecoveryCodeInput: '1',
				},
			},
		});

		await routeHandler(context);

		const doc = parseHtml(context.response.body as string);
		expect(!!doc.querySelector('input[name=email]')).toBe(true);
		expect(!!doc.querySelector('input[name=password]')).toBe(true);
		expect(!!doc.querySelector('input[name=recoveryCode]')).toBe(true);
	});
});
