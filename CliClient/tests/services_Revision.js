/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
const ItemChange = require('lib/models/ItemChange.js');
const Tag = require('lib/models/Tag.js');
const Revision = require('lib/models/Revision.js');
const BaseModel = require('lib/BaseModel.js');
const RevisionService = require('lib/services/RevisionService.js');
const { shim } = require('lib/shim');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('services_Revision', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('revisionService.intervalBetweenRevisions', 0);
		done();
	});

	it('should create diff and rebuild notes', asyncTest(async () => {
		const service = new RevisionService();

		const n1_v1 = await Note.save({ title: '', author: 'testing' });
		await service.collectRevisions();
		await Note.save({ id: n1_v1.id, title: 'hello', author: 'testing' });
		await service.collectRevisions();
		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome', author: '' });
		await service.collectRevisions();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions.length).toBe(2);
		expect(revisions[1].parent_id).toBe(revisions[0].id);

		const rev1 = await service.revisionNote(revisions, 0);
		expect(rev1.title).toBe('hello');
		expect(rev1.author).toBe('testing');

		const rev2 = await service.revisionNote(revisions, 1);
		expect(rev2.title).toBe('hello welcome');
		expect(rev2.author).toBe('');

		const time_rev2 = Date.now();
		await time.msleep(10);

		const ttl = Date.now() - time_rev2 - 1;
		await service.deleteOldRevisions(ttl);
		const revisions2 = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions2.length).toBe(0);
	}));

	it('should delete old revisions (1 note, 2 rev)', asyncTest(async () => {
		const service = new RevisionService();

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await service.collectRevisions();

		const time_v1 = Date.now();
		await time.msleep(100);

		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await service.collectRevisions();
		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id)).length).toBe(2);

		const ttl = Date.now() - time_v1 - 1;
		await service.deleteOldRevisions(ttl);
		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions.length).toBe(1);

		const rev1 = await service.revisionNote(revisions, 0);
		expect(rev1.title).toBe('hello welcome');
	}));

	it('should delete old revisions (1 note, 3 rev)', asyncTest(async () => {
		const service = new RevisionService();

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'one' });
		await service.collectRevisions();
		const time_v1 = Date.now();
		await time.msleep(100);

		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'one two' });
		await service.collectRevisions();
		const time_v2 = Date.now();
		await time.msleep(100);

		const n1_v3 = await Note.save({ id: n1_v1.id, title: 'one two three' });
		await service.collectRevisions();

		{
			const ttl = Date.now() - time_v1 - 1;
			await service.deleteOldRevisions(ttl);
			const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
			expect(revisions.length).toBe(2);

			const rev1 = await service.revisionNote(revisions, 0);
			expect(rev1.title).toBe('one two');

			const rev2 = await service.revisionNote(revisions, 1);
			expect(rev2.title).toBe('one two three');
		}

		{
			const ttl = Date.now() - time_v2 - 1;
			await service.deleteOldRevisions(ttl);
			const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
			expect(revisions.length).toBe(1);

			const rev1 = await service.revisionNote(revisions, 0);
			expect(rev1.title).toBe('one two three');
		}
	}));

	it('should delete old revisions (2 notes, 2 rev)', asyncTest(async () => {
		const service = new RevisionService();

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'note 1' });
		const n2_v0 = await Note.save({ title: '' });
		const n2_v1 = await Note.save({ id: n2_v0.id, title: 'note 2' });
		await service.collectRevisions();
		const time_n2_v1 = Date.now();
		await time.msleep(100);

		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'note 1 (v2)' });
		const n2_v2 = await Note.save({ id: n2_v1.id, title: 'note 2 (v2)' });
		await service.collectRevisions();

		expect((await Revision.all()).length).toBe(4);

		const ttl = Date.now() - time_n2_v1 - 1;
		await service.deleteOldRevisions(ttl);

		{
			const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
			expect(revisions.length).toBe(1);
			const rev1 = await service.revisionNote(revisions, 0);
			expect(rev1.title).toBe('note 1 (v2)');
		}

		{
			const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n2_v1.id);
			expect(revisions.length).toBe(1);
			const rev1 = await service.revisionNote(revisions, 0);
			expect(rev1.title).toBe('note 2 (v2)');
		}
	}));

	it('should handle conflicts', asyncTest(async () => {
		const service = new RevisionService();

		// A conflict happens in this case:
		// - Device 1 creates note1 (rev1)
		// - Device 2 syncs and get note1
		// - Device 1 modifies note1 (rev2)
		// - Device 2 modifies note1 (rev3)
		// When reconstructing the notes based on the revisions, we need to make sure it follow the right
		// "path". For example, to reconstruct the note at rev2 it would be:
		// rev1 => rev2
		// To reconstruct the note at rev3 it would be:
		// rev1 => rev3
		// And not, for example, rev1 => rev2 => rev3

		const n1_v1 = await Note.save({ title: 'hello' });
		const noteId = n1_v1.id;
		const rev1 = await service.createNoteRevision_(n1_v1);
		const n1_v2 = await Note.save({ id: noteId, title: 'hello Paul' });
		const rev2 = await service.createNoteRevision_(n1_v2, rev1.id);
		const n1_v3 = await Note.save({ id: noteId, title: 'hello John' });
		const rev3 = await service.createNoteRevision_(n1_v3, rev1.id);

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
		expect(revisions.length).toBe(3);
		expect(revisions[1].parent_id).toBe(rev1.id);
		expect(revisions[2].parent_id).toBe(rev1.id);

		const revNote1 = await service.revisionNote(revisions, 0);
		const revNote2 = await service.revisionNote(revisions, 1);
		const revNote3 = await service.revisionNote(revisions, 2);
		expect(revNote1.title).toBe('hello');
		expect(revNote2.title).toBe('hello Paul');
		expect(revNote3.title).toBe('hello John');
	}));

	it('should create a revision for notes that are older than a given interval', asyncTest(async () => {
		const n1 = await Note.save({ title: 'hello' });
		const noteId = n1.id;

		await time.msleep(100);

		// Set the interval in such a way that the note is considered an old one.
		Setting.setValue('revisionService.oldNoteInterval', 50);

		// A revision is created the first time a note is overwritten with new content, and
		// if this note doesn't already have an existing revision.
		// This is mostly to handle old notes that existed before the revision service. If these
		// old notes are changed, there's a chance it's accidental or due to some bug, so we
		// want to preserve a revision just in case.

		{
			await Note.save({ id: noteId, title: 'hello 2' });
			await revisionService().collectRevisions(); // Rev for old note created + Rev for new note
			const all = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
			expect(all.length).toBe(2);
			const revNote1 = await revisionService().revisionNote(all, 0);
			const revNote2 = await revisionService().revisionNote(all, 1);
			expect(revNote1.title).toBe('hello');
			expect(revNote2.title).toBe('hello 2');
		}

		// If the note is saved a third time, we don't automatically create a revision. One
		// will be created x minutes later when the service collects revisions.

		{
			await Note.save({ id: noteId, title: 'hello 3' });
			const all = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
			expect(all.length).toBe(2);
		}
	}));

	it('should create a revision for notes that get deleted (recyle bin)', asyncTest(async () => {
		const n1 = await Note.save({ title: 'hello' });
		const noteId = n1.id;

		await Note.delete(noteId);

		await revisionService().collectRevisions();

		const all = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
		expect(all.length).toBe(1);
		const rev1 = await revisionService().revisionNote(all, 0);
		expect(rev1.title).toBe('hello');
	}));

	it('should not create a revision for notes that get deleted if there is already a revision', asyncTest(async () => {
		const n1 = await Note.save({ title: 'hello' });
		await revisionService().collectRevisions();
		const noteId = n1.id;
		await Note.save({ id: noteId, title: 'hello Paul' });
		await revisionService().collectRevisions(); // REV 1

		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1.id)).length).toBe(1);

		await Note.delete(noteId);

		// At this point there is no need to create a new revision for the deleted note
		// because we already have the latest version as REV 1
		await revisionService().collectRevisions();

		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1.id)).length).toBe(1);
	}));

	it('should not create a revision for new note the first time they are saved', asyncTest(async () => {
		const n1 = await Note.save({ title: 'hello' });

		{
			const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(revisions.length).toBe(0);
		}

		await revisionService().collectRevisions();

		{
			const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(revisions.length).toBe(0);
		}
	}));

	it('should abort collecting revisions when one of them is encrypted', asyncTest(async () => {
		const n1 = await Note.save({ title: 'hello' }); // CHANGE 1
		await revisionService().collectRevisions();
		await Note.save({ id: n1.id, title: 'hello Ringo' }); // CHANGE 2
		await revisionService().collectRevisions();
		await Note.save({ id: n1.id, title: 'hello George' }); // CHANGE 3
		await revisionService().collectRevisions();

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(revisions.length).toBe(2);

		const encryptedRevId = revisions[0].id;

		// Simulate receiving an encrypted revision
		await Revision.save({ id: encryptedRevId, encryption_applied: 1 });
		await Note.save({ id: n1.id, title: 'hello Paul' }); // CHANGE 4

		await revisionService().collectRevisions();

		// Although change 4 is a note update, check that it has not been processed
		// by the collector, due to one of the revisions being encrypted.
		expect(await ItemChange.lastChangeId()).toBe(4);
		expect(Setting.value('revisionService.lastProcessedChangeId')).toBe(3);

		// Simulate the revision being decrypted by DecryptionService
		await Revision.save({ id: encryptedRevId, encryption_applied: 0 });

		await revisionService().collectRevisions();

		// Now that the revision has been decrypted, all the changes can be processed
		expect(await ItemChange.lastChangeId()).toBe(4);
		expect(Setting.value('revisionService.lastProcessedChangeId')).toBe(4);
	}));

	it('should not delete old revisions if one of them is still encrypted (1)', asyncTest(async () => {
		// Test case 1: Two revisions and the first one is encrypted.
		// Calling deleteOldRevisions() with low TTL, which means all revisions
		// should be deleted, but they won't be due to the encrypted one.

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		await time.sleep(0.1);
		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await revisionService().collectRevisions(); // REV 2
		await time.sleep(0.1);

		expect((await Revision.all()).length).toBe(2);

		const revisions = await Revision.all();
		await Revision.save({ id: revisions[0].id, encryption_applied: 1 });

		await revisionService().deleteOldRevisions(0);
		expect((await Revision.all()).length).toBe(2);

		await Revision.save({ id: revisions[0].id, encryption_applied: 0 });

		await revisionService().deleteOldRevisions(0);
		expect((await Revision.all()).length).toBe(0);
	}));

	it('should not delete old revisions if one of them is still encrypted (2)', asyncTest(async () => {
		// Test case 2: Two revisions and the first one is encrypted.
		// Calling deleteOldRevisions() with higher TTL, which means the oldest
		// revision should be deleted, but it won't be due to the encrypted one.

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		const timeRev1 = Date.now();
		await time.msleep(100);

		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await revisionService().collectRevisions(); // REV 2

		expect((await Revision.all()).length).toBe(2);

		const revisions = await Revision.all();
		await Revision.save({ id: revisions[0].id, encryption_applied: 1 });

		const ttl = Date.now() - timeRev1 - 1;
		await revisionService().deleteOldRevisions(ttl);
		expect((await Revision.all()).length).toBe(2);
	}));

	it('should not delete old revisions if one of them is still encrypted (3)', asyncTest(async () => {
		// Test case 2: Two revisions and the second one is encrypted.
		// Calling deleteOldRevisions() with higher TTL, which means the oldest
		// revision should be deleted, but it won't be due to the encrypted one.

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		const timeRev1 = Date.now();
		await time.msleep(100);

		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await revisionService().collectRevisions(); // REV 2

		expect((await Revision.all()).length).toBe(2);

		const revisions = await Revision.all();
		await Revision.save({ id: revisions[1].id, encryption_applied: 1 });

		let ttl = Date.now() - timeRev1 - 1;
		await revisionService().deleteOldRevisions(ttl);
		expect((await Revision.all()).length).toBe(2);

		await Revision.save({ id: revisions[1].id, encryption_applied: 0 });

		ttl = Date.now() - timeRev1 - 1;
		await revisionService().deleteOldRevisions(ttl);
		expect((await Revision.all()).length).toBe(1);
	}));

	it('should not create a revision if the note has not changed', asyncTest(async () => {
		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		expect((await Revision.all()).length).toBe(1);

		const n1_v2 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // Note has not changed (except its timestamp) so don't create a revision
		expect((await Revision.all()).length).toBe(1);
	}));

	it('should preserve user update time', asyncTest(async () => {
		// user_updated_time is kind of tricky and can be changed automatically in various
		// places so make sure it is saved correctly with the revision

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		expect((await Revision.all()).length).toBe(1);

		const userUpdatedTime = Date.now() - 1000 * 60 * 60;
		const n1_v2 = await Note.save({ id: n1_v0.id, title: 'hello', updated_time: Date.now(), user_updated_time: userUpdatedTime }, { autoTimestamp: false });
		await revisionService().collectRevisions(); // Only the user timestamp has changed, but that needs to be saved

		const revisions = await Revision.all();
		expect(revisions.length).toBe(2);

		const revNote = await revisionService().revisionNote(revisions, 1);
		expect(revNote.user_updated_time).toBe(userUpdatedTime);
	}));

	it('should not create a revision if there is already a recent one', asyncTest(async () => {
		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		const timeRev1 = Date.now();
		await time.sleep(2);

		const timeRev2 = Date.now();
		const n1_v2 = await Note.save({ id: n1_v0.id, title: 'hello 2' });
		await revisionService().collectRevisions(); // REV 2
		expect((await Revision.all()).length).toBe(2);

		const interval = Date.now() - timeRev1 + 1;
		Setting.setValue('revisionService.intervalBetweenRevisions', interval);

		const n1_v3 = await Note.save({ id: n1_v0.id, title: 'hello 3' });
		await revisionService().collectRevisions(); // No rev because time since last rev is less than the required 'interval between revisions'
		expect(Date.now() - interval < timeRev2).toBe(true); // check the computer is not too slow for this test
		expect((await Revision.all()).length).toBe(2);
	}));
});
