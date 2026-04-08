const shim = require('./shim').default;
const OidcApi = require('./OidcApi').default;

const makeResponse = (status, body) => {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? 'OK' : 'Error',
		text: async () => typeof body === 'string' ? body : JSON.stringify(body),
	};
};

describe('OidcApi', () => {
	let originalFetch;
	let originalRandomBytes;
	let originalDigest;

	beforeEach(() => {
		originalFetch = shim.fetch;
		originalRandomBytes = shim.randomBytes;
		originalDigest = shim.crypto.digest;

		shim.randomBytes = jest.fn(async byteCount => Buffer.alloc(byteCount, 1));
		shim.crypto.digest = jest.fn(async () => Buffer.from('digest-value'));
	});

	afterEach(() => {
		shim.fetch = originalFetch;
		shim.randomBytes = originalRandomBytes;
		shim.crypto.digest = originalDigest;
	});

	test('should build an auth URL and exchange an auth code', async () => {
		const fetchMock = jest.fn(async (url, options) => {
			if (url.includes('/.well-known/openid-configuration')) {
				return makeResponse(200, {
					issuer: 'https://issuer.example.com',
					authorization_endpoint: 'https://issuer.example.com/auth',
					token_endpoint: 'https://issuer.example.com/token',
				});
			}

			expect(url).toBe('https://issuer.example.com/token');
			expect(options.method).toBe('POST');
			expect(options.body).toContain('grant_type=authorization_code');
			expect(options.body).toContain('code=auth-code');
			expect(options.body).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A9967');
			expect(options.body).toContain('code_verifier=');

			return makeResponse(200, {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
				expires_in: 3600,
			});
		});

		shim.fetch = fetchMock;

		const api = new OidcApi({
			issuer: 'https://issuer.example.com',
			clientId: 'client-id',
			scope: 'openid offline_access',
		});

		const authUrl = await api.authCodeUrl('http://localhost:9967');
		const parsedAuthUrl = new URL(authUrl);
		expect(parsedAuthUrl.origin + parsedAuthUrl.pathname).toBe('https://issuer.example.com/auth');
		expect(parsedAuthUrl.searchParams.get('client_id')).toBe('client-id');
		expect(parsedAuthUrl.searchParams.get('scope')).toBe('openid offline_access');
		expect(parsedAuthUrl.searchParams.get('code_challenge_method')).toBe('S256');
		expect(parsedAuthUrl.searchParams.get('state')).toBeTruthy();

		await api.execTokenRequest('auth-code', 'http://localhost:9967', parsedAuthUrl.searchParams.get('state'));

		expect(api.auth().access_token).toBe('access-token');
		expect(api.auth().refresh_token).toBe('refresh-token');
		expect(api.auth().expires_at).toBeGreaterThan(Date.now());
	});

	test('should refresh an expired access token', async () => {
		const fetchMock = jest.fn(async url => {
			if (url.includes('/.well-known/openid-configuration')) {
				return makeResponse(200, {
					issuer: 'https://issuer.example.com',
					authorization_endpoint: 'https://issuer.example.com/auth',
					token_endpoint: 'https://issuer.example.com/token',
				});
			}

			return makeResponse(200, {
				access_token: 'fresh-access-token',
				refresh_token: 'refresh-token',
				expires_in: 3600,
			});
		});

		shim.fetch = fetchMock;

		const api = new OidcApi({
			issuer: 'https://issuer.example.com',
			clientId: 'client-id',
		});

		api.setAuth({
			access_token: 'expired-access-token',
			refresh_token: 'refresh-token',
			expires_at: Date.now() - 1,
		});

		const accessToken = await api.ensureValidAccessToken();
		expect(accessToken).toBe('fresh-access-token');
		expect(api.auth().access_token).toBe('fresh-access-token');
	});
});
