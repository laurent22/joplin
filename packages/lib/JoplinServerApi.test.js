const JoplinServerApi = require('./JoplinServerApi').default;
const shim = require('./shim').default;

describe('JoplinServerApi', () => {
	it('should keep user-facing unknown HTTP errors concise while preserving response details', async () => {
		const api = new JoplinServerApi({
			baseUrl: () => 'https://example.test',
			userContentBaseUrl: () => 'https://usercontent.example.test',
			username: () => '',
			password: () => '',
			apiKey: () => '',
			session: () => ({ id: 'session_1', user_id: 'user_1' }),
		});

		const html = '<!DOCTYPE html><html><body><h1>Joplin Cloud is down for maintenance</h1></body></html>';

		const fetchSpy = jest.spyOn(shim, 'fetch').mockResolvedValue({
			ok: false,
			status: 502,
			text: async () => html,
		});

		try {
			await api.exec('GET', 'api/ping');
			throw new Error('Expected JoplinServerApi.exec to throw');
		} catch (error) {
			const joplinError = error;
			expect(joplinError.message).toBe('Error 502 Bad Gateway');
			expect(joplinError.message.includes('<html>')).toBe(false);
			expect(joplinError.details.includes('<html>')).toBe(true);
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
