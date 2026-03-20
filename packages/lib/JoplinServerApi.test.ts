import JoplinServerApi from './JoplinServerApi';
import { mockFetch } from './testing/test-utils';

interface JoplinServerApiError {
	message: string;
	details?: string;
}

function isJoplinServerApiError(error: unknown): error is JoplinServerApiError {
	if (typeof error !== 'object' || error === null) return false;
	const e = error as Record<string, unknown>;
	if (typeof e.message !== 'string') return false;
	if (!('details' in e)) return true;
	return typeof e.details === 'string' || typeof e.details === 'undefined';
}

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
			await api.exec('GET', 'api/ping');
			throw new Error('Expected JoplinServerApi.exec to throw');
		} catch (error: unknown) {
			if (!isJoplinServerApiError(error)) throw error;
			const joplinError = error;
			expect(joplinError.message).toBe('Error 502 Bad Gateway');
			expect(joplinError.message.includes('<html>')).toBe(false);
			expect(joplinError.details?.includes('<html>')).toBe(true);
		} finally {
			fetchMock.reset();
		}
	});
});
