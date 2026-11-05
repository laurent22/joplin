import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, koaAppContext, expectThrow, expectHttpError } from '../utils/testing/testUtils';
import { defaultSessionTtl } from './SessionModel';
import { Services } from '../services/types';
import { ErrorForbidden, ErrorTooManyRequests } from '../utils/errors';
import { limiterLoginAccountBruteForce } from '../utils/request/limiterAccountBruteForce';
import * as crypto from '../utils/crypto';

// Each attempt uses a different password, as the same rejected password is only counted once
const failLogin = async (email: string, services: Services, times: number, passwordPrefix = 'wrong-password') => {
	for (let i = 0; i < times; i++) {
		await expectThrow(async () => models().session().authenticate(email, `${passwordPrefix}-${i}`, services, ''));
	}
};

describe('SessionModel', () => {

	beforeAll(async () => {
		await beforeAllDb('SessionModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
		// The counts live in memory for the lifetime of the process, so they
		// would otherwise carry over between tests.
		await limiterLoginAccountBruteForce.reset();
	});

	afterEach(() => {
		// Only the brute-force tests below enable the account limiter: it is
		// off under test by default, because most tests log in repeatedly.
		delete process.env.JOPLIN_TEST_ACCOUNT_LIMITER;
	});

	test('should delete expired sessions', async () => {
		jest.useFakeTimers();

		const t0 = new Date('2020-01-01T00:00:00').getTime();
		jest.setSystemTime(t0);

		const mfaCode = '';

		const { user, password } = await createUserAndSession(1);
		const ctx = await koaAppContext();
		const services = ctx.joplin.services;

		await models().session().authenticate(user.email, password, services, mfaCode);

		jest.setSystemTime(new Date(t0 + defaultSessionTtl + 10));

		const lastSession = await models().session().authenticate(user.email, password, services, mfaCode);

		expect(await models().session().count()).toBe(3);

		await models().session().deleteExpiredSessions();

		expect(await models().session().count()).toBe(1);
		expect((await models().session().all())[0].id).toBe(lastSession.id);

		await models().session().authenticate(user.email, password, services, mfaCode);
		await models().session().deleteExpiredSessions();

		expect(await models().session().count()).toBe(2);

		jest.useRealTimers();
	});

	test('should block an account after too many failed logins, whatever the source', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		const services = (await koaAppContext()).joplin.services;

		await failLogin(user.email, services, 10);

		// The count is on the account rather than the IP address, so the
		// correct password is refused too - otherwise an attacker only needs
		// to change address to continue. It must be refused as rate limiting
		// (429) rather than as a bad password.
		await expectHttpError(async () => models().session().authenticate(user.email, password, services, ''), ErrorTooManyRequests.httpCode);
	});

	test('should count concurrent attempts before letting more through', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		const services = (await koaAppContext()).joplin.services;

		const passwords = [...Array(15)].map((_, i) => `wrong-password-${i}`).concat(password);
		const results = await Promise.allSettled(passwords.map(p => models().session().authenticate(user.email, p, services, '')));

		const httpCodes = results.map(r => r.status === 'rejected' ? r.reason.httpCode : 200);
		expect(httpCodes).toEqual([...Array(10).fill(ErrorForbidden.httpCode), ...Array(6).fill(ErrorTooManyRequests.httpCode)]);
	});

	test.each([
		[false, 'unblock'],
		[true, 'not unblock'],
	])('when the password is reset, with MFA = %s, should %s the account', async (withMfa) => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user } = await createUserAndSession(1);
		if (withMfa) await models().user().save({ id: user.id, totp_secret: 'mfa-is-enabled' });
		const services = (await koaAppContext()).joplin.services;

		await failLogin(user.email, services, 10);

		const url = await models().user().generateLinkForPasswordReset(user.id);
		await models().user().resetPassword(url.split('?token=')[1], { password: 'correct-horse-battery-staple', password2: 'correct-horse-battery-staple' });

		// With MFA the account stays blocked, so the login is refused as rate limiting rather than asking for the code
		const login = async () => models().session().authenticate(user.email, 'correct-horse-battery-staple', services, '');
		if (withMfa) {
			await expectHttpError(login, ErrorTooManyRequests.httpCode);
		} else {
			expect(await login()).toBeTruthy();
		}
	});

	test('should let the owner of a blocked account log in with their password and a valid MFA code', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		const { user: userWithoutMfa, password: passwordWithoutMfa } = await createUserAndSession(2);
		await models().user().save({ id: user.id, totp_secret: 'mfa-is-enabled' });
		const services = (await koaAppContext()).joplin.services;
		const isValidMfaCode = jest.spyOn(crypto, 'isValidMFACode').mockImplementation((_secret, code) => code === '123456');

		try {
			// Blocked by someone who only knows the email addresses
			await failLogin(user.email, services, 10);
			await failLogin(userWithoutMfa.email, services, 10);

			// While blocked, any failure is reported as rate limiting, so that it does not tell whether the password was
			// right, and a code is no help without MFA
			await expectHttpError(async () => models().session().authenticate(user.email, 'wrong-password', services, '123456'), ErrorTooManyRequests.httpCode);
			await expectHttpError(async () => models().session().authenticate(user.email, password, services, '000000'), ErrorTooManyRequests.httpCode);
			await expectHttpError(async () => models().session().authenticate(userWithoutMfa.email, passwordWithoutMfa, services, '123456'), ErrorTooManyRequests.httpCode);

			expect(await models().session().authenticate(user.email, password, services, '123456')).toBeTruthy();
		} finally {
			isValidMfaCode.mockRestore();
		}
	});

	test('should still limit MFA codes from someone who knows the password', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		await models().user().save({ id: user.id, totp_secret: 'mfa-is-enabled' });
		const services = (await koaAppContext()).joplin.services;
		const isValidMfaCode = jest.spyOn(crypto, 'isValidMFACode').mockImplementation((_secret, code) => code === '123456');

		try {
			for (let i = 0; i < 10; i++) {
				await expectThrow(async () => models().session().authenticate(user.email, password, services, `00000${i}`));
			}

			await expectHttpError(async () => models().session().authenticate(user.email, password, services, '123456'), ErrorTooManyRequests.httpCode);
		} finally {
			isValidMfaCode.mockRestore();
		}
	});

	test('should count a repeated MFA code each time, as it is a new guess once the code has changed', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		await models().user().save({ id: user.id, totp_secret: 'mfa-is-enabled' });
		const services = (await koaAppContext()).joplin.services;
		const isValidMfaCode = jest.spyOn(crypto, 'isValidMFACode').mockImplementation((_secret, code) => code === '123456');

		try {
			for (let i = 0; i < 10; i++) {
				await expectThrow(async () => models().session().authenticate(user.email, password, services, '000000'));
			}

			await expectHttpError(async () => models().session().authenticate(user.email, password, services, '123456'), ErrorTooManyRequests.httpCode);
		} finally {
			isValidMfaCode.mockRestore();
		}
	});

	test('should not block other accounts', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user: user1 } = await createUserAndSession(1);
		const { user: user2, password: password2 } = await createUserAndSession(2);
		const services = (await koaAppContext()).joplin.services;

		await failLogin(user1.email, services, 10);

		expect(await models().session().authenticate(user2.email, password2, services, '')).toBeTruthy();
	});

	test('should clear the count after a successful login', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		const services = (await koaAppContext()).joplin.services;

		await failLogin(user.email, services, 9);
		expect(await models().session().authenticate(user.email, password, services, '')).toBeTruthy();

		// Having logged in, the user is not penalised for the earlier
		// mistakes.
		await failLogin(user.email, services, 9, 'other-wrong-password');
		expect(await models().session().authenticate(user.email, password, services, '')).toBeTruthy();
	});

	test.each([
		['the same outdated password, as a device that was not updated after a password change does', async (email: string, services: Services) => {
			await expectThrow(async () => models().session().authenticate(email, 'outdated-password', services, ''));
		}],
		['the correct password without an MFA code, as the API does', async (email: string, services: Services, password: string) => {
			await expectThrow(async () => models().session().authenticate(email, password, services, null));
		}],
		['an error that is not a rejected credential', async (email: string, services: Services) => {
			const login = jest.spyOn(models().user(), 'login').mockRejectedValueOnce(new Error('Database timeout'));
			await expectThrow(async () => models().session().authenticate(email, 'any-password', services, ''));
			login.mockRestore();
		}],
	])('should not count %s', async (_case, attempt) => {
		process.env.JOPLIN_TEST_ACCOUNT_LIMITER = '1';

		const { user, password } = await createUserAndSession(1);
		await models().user().save({ id: user.id, totp_secret: 'mfa-is-enabled' });
		const services = (await koaAppContext()).joplin.services;

		for (let i = 0; i < 20; i++) await attempt(user.email, services, password);

		// Not blocked: still refused for the missing MFA code, rather than as rate limiting
		await expectHttpError(async () => models().session().authenticate(user.email, password, services, ''), ErrorForbidden.httpCode);
	});

});
