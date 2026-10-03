import Setting from '../models/Setting';
import SyncTargetRegistry from '../SyncTargetRegistry';
import { setupDatabase, switchClient, withWarningSilenced } from '../testing/test-utils';
import { completePendingAuthentication } from './joplinOAuthUtils';

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
});
