import WebDavApi from './WebDavApi';
import { mockFetch } from './testing/test-utils';

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
		const mockResponse = {
			body: html,
			status: 502,
			statusText: 'Bad Gateway',
			headers: { 'Content-Type': 'text/html' },
		};
		const fetchMock = mockFetch(() => {
			return new Response(mockResponse.body, { status: mockResponse.status, statusText: mockResponse.statusText, headers: mockResponse.headers });
		});

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
			fetchMock.reset();
		}
	});
});
