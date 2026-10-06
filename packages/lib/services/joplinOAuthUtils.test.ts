import Setting from '../models/Setting';
import SyncTargetRegistry from '../SyncTargetRegistry';
import { mockFetch, setupDatabase, switchClient, withWarningSilenced } from '../testing/test-utils';
import { completePendingAuthentication, fetchLoginUrl } from './joplinOAuthUtils';

describe('joplinOAuthUtils', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
	});

	it('should refuse to complete pending authentication if the server URL has changed', async () => {
		const syncTargetId = SyncTargetRegistry.nameToId('joplinServer');
		Setting.setValue('sync.target', syncTargetId);
		Setting.setValue(`sync.${syncTargetId}.path`, 'http://localhost:1234/');
		Setting.setValue(`sync.${syncTargetId}.pendingAuthData`, {
			path: 'http://localhost:1235/',
			appId: 'some-id-here',
		});

		await withWarningSilenced(/Could not complete pending authentication:.*: Server URL changed since last/, async () => {
			await completePendingAuthentication();
		}, { requireWarning: true });

		expect(Setting.value(`sync.${syncTargetId}.pendingAuthData`)).toEqual({});
	});

	it('should not try to fetch a login URL for Joplin Cloud', async () => {
		const syncTargetId = SyncTargetRegistry.nameToId('joplinCloud');
		Setting.setValue('sync.target', syncTargetId);

		const { reset } = mockFetch((_request) => {
			throw new Error('Should not fetch');
		});
		try {
			const url = await fetchLoginUrl(syncTargetId, Setting.value(`sync.${syncTargetId}.path`));
			expect(url).toBe(Setting.value(`sync.${syncTargetId}.website`));
		} finally {
			reset();
		}
	});
});
