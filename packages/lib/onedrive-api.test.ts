import OneDriveApi from './onedrive-api';
import shim from './shim';

describe('onedrive-api', () => {
	test('large uploads send string header values', async () => {
		const fetchMock = jest.spyOn(shim, 'fetch')
			.mockResolvedValueOnce({ ok: true, json: async () => ({ uploadUrl: 'https://example.com/upload' }) } as Response)
			.mockResolvedValue({ ok: true } as Response);

		try {
			const api = new OneDriveApi('testID', 'secret', true);
			await api.uploadBigFile('https://example.com/createUploadSession', {
				body: Buffer.alloc(4 * 1024 * 1024 + 1),
				headers: { Authorization: 'testing' },
			});

			const chunkHeaders = fetchMock.mock.calls[1][1].headers;
			expect(chunkHeaders['Content-Length']).toBe(`${4 * 1024 * 1024 + 1}`);
			expect(Object.values(chunkHeaders).every(value => typeof value === 'string')).toBe(true);
		} finally {
			fetchMock.mockRestore();
		}
	});

	test.each([
		[{ Authorization: 'testing' }, { Authorization: '[[DELETED]]' }],
		[{ headers: { Authorization: 'testing' } }, { headers: { Authorization: '[[DELETED]]' } }],
		[
			{ foo: { Authorization: 'testing', bar: 'test' }, baz: 'test2', Authorization: 'testing' },
			{ foo: { Authorization: '[[DELETED]]', bar: 'test' }, baz: 'test2', Authorization: '[[DELETED]]' },
		],
		[
			{ a: { b: { c: { d: { e: { f: { g: 'Test' } } } }, Authorization: 'bearer someidhere' } } },
			{ a: { b: { c: { d: { e: { f: '[[depth-exceeded]]' } } }, Authorization: '[[DELETED]]' } } },
		],
	])('authorizationTokenRemoved should remove Authorization field', (object, expected) => {
		const api = new OneDriveApi('testID', 'secret', true);
		expect(api.authorizationTokenRemoved(object)).toMatchObject(expected);
	});
});
