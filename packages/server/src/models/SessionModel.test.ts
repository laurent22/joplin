import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, koaAppContext, expectThrow, expectHttpError } from '../utils/testing/testUtils';
import { defaultSessionTtl } from './SessionModel';
import { Services } from '../services/types';
import { ErrorForbidden, ErrorTooManyRequests } from '../utils/errors';
import { limiterLoginAccountBruteForce } from '../utils/request/limiterAccountBruteForce';

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
