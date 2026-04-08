const shim = require('./shim').default;
const WebDavApi = require('./WebDavApi').default;

const makeResponse = (status, body) => {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? 'OK' : 'Unauthorized',
		text: async () => body,
	};
};

describe('WebDavApi', () => {
	let originalFetch;

	beforeEach(() => {
		originalFetch = shim.fetch;
	});

	afterEach(() => {
		shim.fetch = originalFetch;
	});

	test('should refresh bearer auth and retry the request once', async () => {
		let accessToken = 'expired-token';
		const fetchMock = jest.fn(async (_url, options) => {
			if (options.headers.Authorization === 'Bearer expired-token') {
				return makeResponse(401, 'Unauthorized');
			}

			return makeResponse(200, 'done');
		});

		shim.fetch = fetchMock;

		const api = new WebDavApi({
			baseUrl: () => 'https://example.com/webdav',
			username: () => '',
			password: () => '',
			authMethod: () => 'bearer',
			accessToken: async () => accessToken,
			onAuthError: async () => {
				accessToken = 'fresh-token';
				return true;
			},
		});

		const result = await api.exec('GET', 'status', null, null, { responseFormat: 'text' });

		expect(result).toBe('done');
		expect(fetchMock.mock.calls).toHaveLength(2);
		expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer expired-token');
		expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-token');
	});
});
