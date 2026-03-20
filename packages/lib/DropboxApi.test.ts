import { mockFetch } from './testing/test-utils';
const DropboxApi = require('./DropboxApi');

interface DropboxApiError {
	message: string;
	details: string;
}

function isDropboxError(error: unknown): error is DropboxApiError {
	if (typeof error !== 'object' || error === null) return false;
	const e = error as Record<string, unknown>;
	return typeof e.message === 'string' && typeof e.details === 'string';
}

describe('DropboxApi', () => {
	it('should keep user-facing HTTP errors concise while preserving response details', async () => {
		const api = new DropboxApi({
			id: 'client_id',
			secret: 'client_secret',
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
			await api.exec('POST', 'files/create_folder_v2', { path: '/test' });
			throw new Error('Expected DropboxApi.exec to throw');
		} catch (error: unknown) {
			if (!isDropboxError(error)) throw error;
			const dropboxError = error;
			expect(dropboxError.message).toBe('Error');
			expect(dropboxError.message.includes('<html>')).toBe(false);
			expect(dropboxError.details.includes('<html>')).toBe(true);
		} finally {
			fetchMock.reset();
		}
	});
});
