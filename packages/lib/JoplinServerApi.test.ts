import JoplinServerApi from './JoplinServerApi';
import shim from './shim';

describe('JoplinServerApi', () => {

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('should pass ignoreTlsErrors to uploadBlob requests', async () => {
		const uploadBlobSpy = jest.spyOn(shim, 'uploadBlob').mockImplementation(async (_url, options) => {
			return {
				ok: true,
				status: 200,
				headers: options.headers,
				text: async () => 'ok',
			};
		});

		jest.spyOn(shim, 'fsDriver').mockImplementation(() => {
			return {
				stat: async () => ({ size: 7 }),
			} as any;
		});

		const api = new JoplinServerApi({
			baseUrl: () => 'https://joplin.lan',
			userContentBaseUrl: () => 'https://joplinusercontent.lan',
			username: () => '',
			password: () => '',
			apiKey: () => '',
			session: () => ({ id: 'session-id', user_id: 'user-id' }),
			ignoreTlsErrors: () => true,
		});

		await api.exec(
			'PUT',
			'api/items/root:/.resource/test:/content',
			null,
			null,
			{ 'Content-Type': 'application/octet-stream' },
			{ source: 'file', path: '/tmp/test-resource', responseFormat: 'text' as any },
		);

		expect(uploadBlobSpy).toHaveBeenCalledTimes(1);
		expect(uploadBlobSpy).toHaveBeenCalledWith(
			'https://joplin.lan/api/items/root:/.resource/test:/content',
			expect.objectContaining({
				method: 'PUT',
				path: '/tmp/test-resource',
				ignoreTlsErrors: true,
				headers: expect.objectContaining({
					'Content-Type': 'application/octet-stream',
					'Content-Length': '7',
					'X-API-AUTH': 'session-id',
					'X-API-MIN-VERSION': '2.6.0',
				}),
			}),
		);
	});
});
