import Setting from '../../models/Setting';
import BaseModel from '../../BaseModel';
import { synchronizerStart, revisionService, setupDatabaseAndSynchronizer, synchronizer, switchClient, encryptionService, loadEncryptionMasterKey, decryptionWorker } from '../../testing/test-utils';
import Note from '../../models/Note';
import Revision from '../../models/Revision';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from '../e2ee/utils';

describe('Synchronizer.revisions', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should not save revisions when updating a note via sync', (async () => {
		// When a note is updated, a revision of the original is created.
		// Here, on client 1, the note is updated for the first time, however since it is
		// via sync, we don't create a revision - that revision has already been created on client
		// 2 and is going to be synced.

		const n1 = await Note.save({ title: 'testing' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.save({ id: n1.id, title: 'mod from client 2' });
		await revisionService().collectRevisions();
		const allRevs1 = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(allRevs1.length).toBe(1);
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();
		const allRevs2 = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(allRevs2.length).toBe(1);
		expect(allRevs2[0].id).toBe(allRevs1[0].id);
	}));

	it('should not save revisions when deleting a note via sync', (async () => {
		const n1 = await Note.save({ title: 'testing' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.delete(n1.id);
		await revisionService().collectRevisions(); // REV 1
		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart(); // The local note gets deleted here, however a new rev is *not* created
		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}

		const notes = await Note.all();
		expect(notes.length).toBe(0);
	}));

	it('should not save revisions when an item_change has been generated as a result of a sync', (async () => {
		// When a note is modified an item_change object is going to be created. This
		// is used for example to tell the search engine, when note should be indexed. It is
		// also used by the revision service to tell what note should get a new revision.
		// When a note is modified via sync, this item_change object is also created. The issue
		// is that we don't want to create revisions for these particular item_changes, because
		// such revision has already been created on another client (whatever client initially
		// modified the note), and that rev is going to be synced.
		//
		// So in the end we need to make sure that we don't create these unnecessary additional revisions.

		const n1 = await Note.save({ title: 'testing' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.save({ id: n1.id, title: 'mod from client 2' });
		await revisionService().collectRevisions();
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();

		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}

		await revisionService().collectRevisions();

		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}
	}));

	it('should handle case when new rev is created on client, then older rev arrives later via sync', (async () => {
		// - C1 creates note 1
		// - C1 modifies note 1 - REV1 created
		// - C1 sync
		// - C2 sync
		// - C2 receives note 1
		// - C2 modifies note 1 - REV2 created (but not based on REV1)
		// - C2 receives REV1
		//
		// In that case, we need to make sure that REV1 and REV2 are both valid and can be retrieved.
		// Even though REV1 was created before REV2, REV2 is *not* based on REV1. This is not ideal
		// due to unnecessary data being saved, but a possible edge case and we simply need to check
		// all the data is valid.

		// Note: this test seems to be a bit shaky because it doesn't work if the synchronizer
		// context is passed around (via synchronizerStart()), but it should.

		const n1 = await Note.save({ title: 'note' });
		await Note.save({ id: n1.id, title: 'note REV1' });
		await revisionService().collectRevisions(); // REV1
		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1.id)).length).toBe(1);
		await synchronizer().start();

		await switchClient(2);

		synchronizer().testingHooks_ = ['skipRevisions'];
		await synchronizer().start();
		synchronizer().testingHooks_ = [];

		await Note.save({ id: n1.id, title: 'note REV2' });
		await revisionService().collectRevisions(); // REV2
		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1.id)).length).toBe(1);
		await synchronizer().start(); // Sync the rev that had been skipped above with skipRevisions

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(revisions.length).toBe(2);

		expect((await revisionService().revisionNote(revisions, 0)).title).toBe('note REV1');
		expect((await revisionService().revisionNote(revisions, 1)).title).toBe('note REV2');
	}));

	it('should not create revisions when item is modified as a result of decryption', (async () => {
		// Handle this scenario:
		// - C1 creates note
		// - C1 never changes it
		// - E2EE is enabled
		// - C1 sync
		// - More than one week later (as defined by oldNoteCutOffDate_), C2 sync
		// - C2 enters master password and note gets decrypted
		//
		// Technically at this point the note is modified (from encrypted to non-encrypted) and thus a ItemChange
		// object is created. The note is also older than oldNoteCutOffDate. However, this should not lead to the
		// creation of a revision because that change was not the result of a user action.
		// I guess that's the general rule - changes that come from user actions should result in revisions,
		// while automated changes (sync, decryption) should not.

		const dateInPast = revisionService().oldNoteCutOffDate_() - 1000;

		await Note.save({ title: 'ma note', updated_time: dateInPast, created_time: dateInPast }, { autoTimestamp: false });
		const masterKey = await loadEncryptionMasterKey();
		await setupAndEnableEncryption(encryptionService(), masterKey, '123456');
		await loadMasterKeysFromSettings(encryptionService());
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
		await loadMasterKeysFromSettings(encryptionService());
		await decryptionWorker().start();

		await revisionService().collectRevisions();

		expect((await Revision.all()).length).toBe(0);
	}));

	it('should delete old revisions remotely when deleted locally', async () => {
		Setting.setValue('revisionService.intervalBetweenRevisions', 100);
		jest.useFakeTimers({ advanceTimers: true });

		const note = await Note.save({ title: 'note' });
		const getNoteRevisions = () => {
			return Revision.allByType(BaseModel.TYPE_NOTE, note.id);
		};
		jest.advanceTimersByTime(200);

		await Note.save({ id: note.id, title: 'note REV0' });
		jest.advanceTimersByTime(200);

		await revisionService().collectRevisions(); // REV0
		expect(await getNoteRevisions()).toHaveLength(1);

		jest.advanceTimersByTime(200);

		await Note.save({ id: note.id, title: 'note REV1' });
		await revisionService().collectRevisions(); // REV1
		expect(await getNoteRevisions()).toHaveLength(2);

		// Should sync the revisions
		await synchronizer().start();
		await switchClient(2);
		await synchronizer().start();

		expect(await getNoteRevisions()).toHaveLength(2);
		await revisionService().deleteOldRevisions(100);
		expect(await getNoteRevisions()).toHaveLength(0);

		await synchronizer().start();
		expect(await getNoteRevisions()).toHaveLength(0);

		// Syncing a new client should not download the deleted revisions
		await setupDatabaseAndSynchronizer(3);
		await switchClient(3);
		await synchronizer().start();
		expect(await getNoteRevisions()).toHaveLength(0);

		// After switching back to the original client, syncing should locally delete
		// the remotely deleted revisions.
		await switchClient(1);
		expect(await getNoteRevisions()).toHaveLength(2);
		await synchronizer().start();
		expect(await getNoteRevisions()).toHaveLength(0);

		jest.useRealTimers();
	});
});
