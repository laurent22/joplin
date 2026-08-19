import { totp } from 'otplib';
import routeHandler from '../../middleware/routeHandler';
import { cookieGet, cookieSet } from '../../utils/cookies';
import { execRequest } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, koaAppContext } from '../../utils/testing/testUtils';

describe('index/recovery_codes', () => {

	beforeAll(async () => {
		await beforeAllDb('index_recovery_codes', {
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

	test('should not be able to see recovery codes without access key', async () => {
		const { session, user } = await createUserAndSession(1);
		await models().user().enableMFA(user.id, 'asdf', session.id);

		const response1 = await execRequest(session.id, 'GET', 'recovery_codes');

		expect(response1).toBe(null);
	});

	test('should be able to see recovery codes if it has access key', async () => {
		const { session, user } = await createUserAndSession(1);
		await models().user().enableMFA(user.id, 'asdf', session.id);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/recovery_codes',
			},
		});
		const recoveryCodeAccessKey = await models().recoveryCode().saveRecoveryCodeAccessKey(user.id);
		cookieSet(context, 'recoveryCodeAccessKey', recoveryCodeAccessKey);
		await routeHandler(context);

		const recoveryCodes = await models().recoveryCode().loadByUserId(user.id);

		expect((context.response.body as string).includes('<h1 class="title">Recovery codes</h1>')).toBe(true);
		expect((context.response.body as string).includes(recoveryCodes[0].code)).toBe(true);
		expect((context.response.body as string).includes(recoveryCodes[1].code)).toBe(true);
		expect((context.response.body as string).includes(recoveryCodes[2].code)).toBe(true);
	});

	test('should allow access to recovery code if mfa code credential gets confirmed', async () => {
		const { session, user } = await createUserAndSession(1);
		await models().user().enableMFA(user.id, 'asdf', session.id);

		const totpCheck = jest.spyOn(totp, 'check');
		totpCheck.mockReturnValue(true);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'POST',
				url: '/recovery_codes/auth',
				body: {
					mfaCode: '123456',
				},
			},
		});
		await routeHandler(context);

		const accessKeyCookie = cookieGet(context, 'recoveryCodeAccessKey');
		expect(accessKeyCookie).not.toBe(null);

		const context2 = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/recovery_codes',
			},
		});
		cookieSet(context2, 'recoveryCodeAccessKey', accessKeyCookie);
		await routeHandler(context2);

		expect((context2.response.body as string).includes('<h1 class="title">Recovery codes</h1>')).toBe(true);
	});

	test('should allow access to recovery code if password credential gets confirmed', async () => {
		const { session, user } = await createUserAndSession(1, undefined, { password: '123456' });
		await models().user().enableMFA(user.id, 'asdf', session.id);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'POST',
				url: '/recovery_codes/auth',
				body: {
					password: '123456',
				},
			},
		});
		await routeHandler(context);

		const accessKeyCookie = cookieGet(context, 'recoveryCodeAccessKey');
		expect(accessKeyCookie).not.toBe(null);

		const context2 = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/recovery_codes',
			},
		});
		cookieSet(context2, 'recoveryCodeAccessKey', accessKeyCookie);
		await routeHandler(context2);

		expect((context2.response.body as string).includes('<h1 class="title">Recovery codes</h1>')).toBe(true);
	});

	test('should not send a email to user the first time recovery codes are accessed', async () => {
		const { session, user } = await createUserAndSession(1, undefined, { email: 'user@localhost' });
		await models().user().enableMFA(user.id, 'asdf', session.id);

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/recovery_codes',
			},
		});
		const recoveryCodeAccessKey = await models().recoveryCode().saveRecoveryCodeAccessKey(user.id);
		cookieSet(context, 'recoveryCodeAccessKey', recoveryCodeAccessKey);
		await routeHandler(context);

		const emails = await models().email().all();

		expect(!!emails.find(e => e.subject === '[Joplin Server] Your multi-factor authentication recovery codes were viewed')).toBe(false);
	});

	test('should send a email to user when the recovery codes are accessed, but the first time', async () => {
		const { session, user } = await createUserAndSession(1, undefined, { email: 'user@localhost' });
		await models().user().enableMFA(user.id, 'asdf', session.id);

		const accessRecoveryCodes = async () => {
			const context = await koaAppContext({
				sessionId: session.id,
				request: {
					method: 'GET',
					url: '/recovery_codes',
				},
			});
			const recoveryCodeAccessKey = await models().recoveryCode().saveRecoveryCodeAccessKey(user.id);
			cookieSet(context, 'recoveryCodeAccessKey', recoveryCodeAccessKey);
			await routeHandler(context);
		};

		// first time doesn't send an email
		await accessRecoveryCodes();

		// second time upwards should receive and email alert
		await accessRecoveryCodes();
		await accessRecoveryCodes();
		await accessRecoveryCodes();

		const emails = await models().email().all();

		expect(emails.filter(e => e.subject === '[Joplin Server] Your multi-factor authentication recovery codes were viewed').length).toBe(3);
	});
});
