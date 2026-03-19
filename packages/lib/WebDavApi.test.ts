import WebDavApi from './WebDavApi';
import shim from './shim';

describe('WebDavApi', () => {
	it('should keep user-facing unknown HTTP errors concise while preserving response details', async () => {
		const api = new WebDavApi({
			baseUrl: () => 'https://example.test/webdav',
			username: () => '',
			password: () => '',
		});

		const html = '<!DOCTYPE html><html><body><h1>Maintenance</h1></body></html>';

		const fetchSpy = jest.spyOn(shim, 'fetch').mockResolvedValue({
			ok: false,
			status: 502,
			text: async () => html,
		} as any);

		try {
			await api.exec('GET', 'locks');
			throw new Error('Expected WebDavApi.exec to throw');
		} catch (error) {
			const webDavError = error as any;
			expect(webDavError.message).toBe('Unknown error 2');
			expect(webDavError.message.includes('<html>')).toBe(false);
			expect(webDavError.details.includes('<html>')).toBe(true);
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
