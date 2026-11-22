import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, createUserAndSession, models, expectHttpError } from '../../utils/testing/testUtils';
import { execRequest } from '../../utils/testing/apiUtils';
import { ErrorBadRequest } from '../../utils/errors';
import config from '../../config';
import { mfaPromptDismissDuration, mfaPromptDismissedKey } from './home';

const hasMfaPrompt = async (sessionId: string) => {
	const response: string = await execRequest(sessionId, 'GET', 'home');
	return response.includes('Turn on multi-factor authentication');
};

describe('index/home', () => {

	beforeAll(async () => {
		await beforeAllDb('index/home');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
		config().MFA_ENABLED = 1;
	});

	test('should show the home page', async () => {
		const { user, session } = await createUserAndSession();

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/home',
			},
		});

		await routeHandler(context);

		expect((context.response.body as string).indexOf(user.email) >= 0).toBe(true);
		expect(context.response.body as string).toContain('class="footer"');
	});

	test('should show the MFA prompt again 30 days after it was dismissed', async () => {
		const { user, session } = await createUserAndSession();
		expect(await hasMfaPrompt(session.id)).toBe(true);

		await execRequest(session.id, 'POST', 'home', { dismissMfaPrompt: '1' });
		expect(await hasMfaPrompt(session.id)).toBe(false);

		await models().keyValue().setValue(mfaPromptDismissedKey(user.id), Date.now() - mfaPromptDismissDuration);
		expect(await hasMfaPrompt(session.id)).toBe(true);
	});

	test('should not dismiss the MFA prompt if the request does not ask for it', async () => {
		const { session } = await createUserAndSession();

		await expectHttpError(async () => execRequest(session.id, 'POST', 'home', {}), ErrorBadRequest.httpCode);
		expect(await hasMfaPrompt(session.id)).toBe(true);
	});

	test('should not show the MFA prompt if the user has MFA enabled or if the MFA feature is disabled', async () => {
		const { user, session } = await createUserAndSession();
		await models().user().save({ id: user.id, totp_secret: 'encrypted-totp-secret' });
		expect(await hasMfaPrompt(session.id)).toBe(false);

		await models().user().save({ id: user.id, totp_secret: '' });
		config().MFA_ENABLED = 0;
		expect(await hasMfaPrompt(session.id)).toBe(false);
	});

});
