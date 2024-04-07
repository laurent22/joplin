import SyncTargetRegistry from '../../SyncTargetRegistry';
import { createNTestNotes, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import BaseItem from '../BaseItem';
import Folder from '../Folder';
import Setting from '../Setting';
import settingValidations from './settingValidations';

describe('settingValidations', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('sync disabled items should prevent switching sync targets unless ignored', async () => {
		const folder = await Folder.save({ title: 'Test' });
		const noteCount = 5;
		const testNotes = await createNTestNotes(noteCount, folder);
		const syncTargetId = SyncTargetRegistry.nameToId('memory');
		Setting.setValue('sync.target', syncTargetId);

		for (const testNote of testNotes) {
			await BaseItem.saveSyncDisabled(syncTargetId, testNote, 'Disabled reason');
		}

		const newSyncTargetId = SyncTargetRegistry.nameToId('dropbox');
		// Validation should fail with some error message.
		expect(await settingValidations(['sync.target'], { 'sync.target': newSyncTargetId })).not.toBe('');

		// Should pass after dismissing all warnings
		for (const testNote of testNotes) {
			await BaseItem.ignoreItemSyncWarning(syncTargetId, testNote);
		}
		expect(await settingValidations(['sync.target'], { 'sync.target': newSyncTargetId })).toBe('');
	});
});
