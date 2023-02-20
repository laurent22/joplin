import { allNotesFolders, remoteNotesAndFolders } from '../../testing/test-utils-synchronizer';
import { afterAllCleanUp, synchronizerStart, setupDatabaseAndSynchronizer, switchClient, fileApi, db } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { clearLocalDataForRedownload, clearLocalSyncStateForReupload } from '../../services/synchronizer/tools';

describe('Synchronizer.tools', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should clear local sync data, and re-upload everything to sync target', (async () => {
		await Folder.save({ title: 'test' });

		await synchronizerStart();

		await fileApi().clearRoot();

		await clearLocalSyncStateForReupload(db());

		// Now that the local sync state has been cleared, it should re-upload
		// the items as if it was a new sync target. It should also not delete*
		// any local data.
		await synchronizerStart();
		expect((await remoteNotesAndFolders()).length).toBe(1);
		expect((await Folder.all()).length).toBe(1);
	}));

	it('should clear local data, and re-downlaod everything from sync target', (async () => {
		const folder = await Folder.save({ title: 'test' });
		await Note.save({ title: 'test note', parent_id: folder.id });

		await synchronizerStart();

		await clearLocalDataForRedownload(db());

		expect((await allNotesFolders()).length).toBe(0);

		await synchronizerStart();

		expect((await allNotesFolders()).length).toBe(2);
		expect((await remoteNotesAndFolders()).length).toBe(2);
	}));

});
