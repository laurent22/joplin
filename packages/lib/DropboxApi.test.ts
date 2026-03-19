import shim from './shim';
const DropboxApi = require('./DropboxApi');

describe('DropboxApi', () => {
	it('should keep user-facing HTTP errors concise while preserving response details', async () => {
		const api = new DropboxApi({
			id: 'client_id',
			secret: 'client_secret',
		});

		const html = '<!DOCTYPE html><html><body><h1>Maintenance</h1></body></html>';

		const fetchSpy = jest.spyOn(shim, 'fetch').mockResolvedValue({
			ok: false,
			status: 502,
			text: async () => html,
		} as any);

		try {
			await api.exec('POST', 'files/create_folder_v2', { path: '/test' });
			throw new Error('Expected DropboxApi.exec to throw');
		} catch (error) {
			const dropboxError = error as any;
			expect(dropboxError.message).toBe('Error');
			expect(dropboxError.message.includes('<html>')).toBe(false);
			expect(dropboxError.details.includes('<html>')).toBe(true);
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
