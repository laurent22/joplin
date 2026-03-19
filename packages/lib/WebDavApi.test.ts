import WebDavApi from './WebDavApi';
import shim from './shim';

interface WebDavApiError {
	message: string;
	details: string;
}

function isWebDavError(error: unknown): error is WebDavApiError {
	if (typeof error !== 'object' || error === null) return false;
	const e = error as Record<string, unknown>;
	return typeof e.message === 'string' && typeof e.details === 'string';
}

describe('WebDavApi', () => {
	it('should keep user-facing unknown HTTP errors concise while preserving response details', async () => {
		const api = new WebDavApi({
			baseUrl: () => 'https://example.test/webdav',
			username: () => '',
			password: () => '',
		});

		const html = '<!DOCTYPE html><html><body><h1>Maintenance</h1></body></html>';
		const mockResponse: Partial<Response> = {
			ok: false,
			status: 502,
			text: async () => html,
		};

		const fetchSpy = jest.spyOn(shim, 'fetch').mockResolvedValue(mockResponse as Response);

		try {
			await api.exec('GET', 'locks');
			throw new Error('Expected WebDavApi.exec to throw');
		} catch (error: unknown) {
			if (!isWebDavError(error)) throw error;
			const webDavError = error;
			expect(webDavError.message).toBe('Unknown error 2');
			expect(webDavError.message.includes('<html>')).toBe(false);
			expect(webDavError.details.includes('<html>')).toBe(true);
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
