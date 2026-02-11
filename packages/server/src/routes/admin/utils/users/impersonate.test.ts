import { afterAllTests, beforeAllDb, beforeEachDb, createUserAndSession, expectThrow, koaAppContext, models } from '../../../../utils/testing/testUtils';
import { cookieGet, cookieSet } from '../../../../utils/cookies';
import { startImpersonating, stopImpersonating } from './impersonate';

describe('users/impersonate', () => {

	beforeAll(async () => {
		await beforeAllDb('users/impersonate');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should impersonate a user', async () => {
		const ctx = await koaAppContext();

		const { user: adminUser, session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		cookieSet(ctx, 'sessionId', adminSession.id);

		await startImpersonating(ctx, user.id, 'http://localhost');

		{
			expect(cookieGet(ctx, 'adminSessionId')).toBe(adminSession.id);
			const sessionUser = await models().session().sessionUser(cookieGet(ctx, 'sessionId'));
			expect(sessionUser.id).toBe(user.id);
		}

		const returnUrl = await stopImpersonating(ctx);

		{
			expect(cookieGet(ctx, 'adminSessionId')).toBeFalsy();
			const sessionUser = await models().session().sessionUser(cookieGet(ctx, 'sessionId'));
			expect(sessionUser.id).toBe(adminUser.id);
			expect(returnUrl).toBe('http://localhost');
		}
	});

	test('should not impersonate if not admin', async () => {
		const ctx = await koaAppContext();

		const { user: adminUser } = await createUserAndSession(1, true);
		const { session } = await createUserAndSession(2);

		cookieSet(ctx, 'sessionId', session.id);

		await expectThrow(async () => startImpersonating(ctx, adminUser.id, 'http://localhost'));
	});

});
