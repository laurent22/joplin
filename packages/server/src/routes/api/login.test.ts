import routeHandler from '../../middleware/routeHandler';
import { beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, models } from '../../utils/testing/testUtils';
import config from '../../config';
import { cookieGet } from '../../utils/cookies';

jest.mock('../../utils/saml', () => ({
	checkLoginResponse: jest.fn(),
	getIdentityProvider: jest.fn(),
	getServiceProvider: jest.fn(async () => ({
		parseLoginResponse: async () => ({ extract: { attributes: { email: 'user1@localhost', displayName: 'User 1' } } }),
	})),
}));

describe('api/login', () => {

	beforeAll(async () => {
		await beforeAllDb('api_login');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test.each([
		['web-login', 1],
		['app-login', 0],
	])('should only email the owner when SAML signs in to the website: %s', async (relayState, expectedEmailCount) => {
		config().saml = { ...config().saml, enabled: true };

		const context = await koaAppContext({
			request: {
				method: 'POST',
				url: '/api/saml',
				headers: { 'x-real-ip': '203.0.113.7' },
				body: { RelayState: relayState },
			},
		});
		await routeHandler(context);

		expect(!!cookieGet(context, 'sessionId')).toBe(relayState === 'web-login');
		const emails = (await models().email().all()).filter(e => e.subject.includes('New sign-in'));
		expect(emails).toHaveLength(expectedEmailCount);
		if (expectedEmailCount) expect(emails[0].body).toContain('IP address: 203.0.113.7');
	});
});
