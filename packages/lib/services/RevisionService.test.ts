import { revisionService, setupDatabaseAndSynchronizer, switchClient, msleep } from '../testing/test-utils';
import Setting from '../models/Setting';
import Note from '../models/Note';
import ItemChange from '../models/ItemChange';
import Revision from '../models/Revision';
import BaseModel, { ModelType } from '../BaseModel';
import RevisionService from '../services/RevisionService';
import { MarkupLanguage } from '../../renderer';
import { NoteEntity } from './database/types';

interface CreateTestRevisionOptions {
	// How long to pause (in milliseconds) between each note modification.
	// For example, [10, 20] would modify the note twice, with pauses of 10ms and 20ms.
	delaysBetweenModifications: number[];
}

const createTestRevisions = async (
	noteProperties: Partial<NoteEntity>,
	{ delaysBetweenModifications }: CreateTestRevisionOptions,
) => {
	const note = await Note.save({
		title: 'note',
		...noteProperties,
	});

	let counter = 0;
	for (const delay of delaysBetweenModifications) {
		jest.advanceTimersByTime(delay);
		await Note.save({ ...noteProperties, id: note.id, title: `note REV${counter++}` });
		await revisionService().collectRevisions();
	}

	return note;
};

describe('services/RevisionService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('revisionService.intervalBetweenRevisions', 0);

		jest.useFakeTimers({ advanceTimers: true });
	});

	it('should create diff and rebuild notes', (async () => {
		const service = new RevisionService();

		const n1_v1 = await Note.save({ title: '', author: 'testing' });
		await service.collectRevisions();
		await Note.save({ id: n1_v1.id, title: 'hello', author: 'testing' });
		await service.collectRevisions();
		await Note.save({ id: n1_v1.id, title: 'hello welcome', author: '' });
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
		await msleep(10);

		const ttl = Date.now() - time_rev2 - 1;
		await service.deleteOldRevisions(ttl);
		const revisions2 = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions2.length).toBe(0);
	}));

	// ----------------------------------------------------------------------
	// This is to verify that the revision service continues processing
	// revisions even when it fails on one note. However, now that the
	// diff-match-patch bug is fixed, it's not possible to create notes that
	// would make the process fail. Keeping the test anyway in case such case
	// comes up again.
	// ----------------------------------------------------------------------

	// it('should handle corrupted strings', (async () => {
	// 	const service = new RevisionService();

	// 	// Silence the logger because the revision service is going to print
	// 	// errors.
	// 	// Logger.globalLogger.enabled = false;

	// 	const n1 = await Note.save({ body: '' });
	// 	await service.collectRevisions();
	// 	await Note.save({ id: n1.id, body: naughtyStrings[152] }); // REV 1
	// 	await service.collectRevisions();
	// 	await Note.save({ id: n1.id, body: naughtyStrings[153] }); // FAIL (Should have been REV 2)
	// 	await service.collectRevisions();

	// 	// Because it fails, only one revision was generated. The second was skipped.
	// 	expect((await Revision.all()).length).toBe(1);

	// 	// From this point, note 1 will always fail because of a
	// 	// diff-match-patch bug:
	// 	// https://github.com/JackuB/diff-match-patch/issues/22
	// 	// It will throw "URI malformed". But it shouldn't prevent other notes
	// 	// from getting revisions.

	// 	const n2 = await Note.save({ body: '' });
	// 	await service.collectRevisions();
	// 	await Note.save({ id: n2.id, body: 'valid' }); // REV 2
	// 	await service.collectRevisions();
	// 	expect((await Revision.all()).length).toBe(2);

	// 	Logger.globalLogger.enabled = true;
	// }));

	it('should delete old revisions (1 note, 2 rev)', (async () => {
		const service = new RevisionService();

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await service.collectRevisions();

		const time_v1 = Date.now();
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await service.collectRevisions();
		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id)).length).toBe(2);

		const ttl = Date.now() - time_v1 - 1;
		await service.deleteOldRevisions(ttl);
		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions.length).toBe(1);

		const rev1 = await service.revisionNote(revisions, 0);
		expect(rev1.title).toBe('hello welcome');
	}));

	it('should delete old revisions (1 note, 3 rev)', (async () => {
		const service = new RevisionService();

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'one' });
		await service.collectRevisions();
		const time_v1 = Date.now();
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'one two' });
		await service.collectRevisions();
		const time_v2 = Date.now();
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'one two three' });
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

	it('should delete old revisions (2 notes, 2 rev)', (async () => {
		const service = new RevisionService();

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'note 1' });
		const n2_v0 = await Note.save({ title: '' });
		const n2_v1 = await Note.save({ id: n2_v0.id, title: 'note 2' });
		await service.collectRevisions();
		const time_n2_v1 = Date.now();
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'note 1 (v2)' });
		await Note.save({ id: n2_v1.id, title: 'note 2 (v2)' });
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

	it('should not error on revisions for missing (not downloaded yet/permanently deleted) notes', async () => {
		Setting.setValue('revisionService.intervalBetweenRevisions', 100);

		const note = await createTestRevisions({
			share_id: 'test-share-id',
		}, { delaysBetweenModifications: [200, 400, 600, 8_000] });
		const getNoteRevisions = () => {
			return Revision.allByType(BaseModel.TYPE_NOTE, note.id);
		};
		expect(await getNoteRevisions()).toHaveLength(4);

		await Note.delete(note.id, { toTrash: false, sourceDescription: 'tests/RevisionService' });

		await revisionService().deleteOldRevisions(4_000);

		// Should leave newer revisions (handle the case where revisions are downloaded before the note).
		expect(await getNoteRevisions()).toHaveLength(1);
	});

	it('should handle conflicts', (async () => {
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
		await service.createNoteRevision_(n1_v2, rev1.id);
		const n1_v3 = await Note.save({ id: noteId, title: 'hello John' });
		await service.createNoteRevision_(n1_v3, rev1.id);

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

	it('should create a revision for notes that are older than a given interval', (async () => {
		const n1 = await Note.save({ title: 'hello' });
		const noteId = n1.id;

		await msleep(100);

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

	it('should create a revision for notes that get deleted (recycle bin)', (async () => {
		const n1 = await Note.save({ title: 'hello' });
		const noteId = n1.id;

		await Note.delete(noteId);

		await revisionService().collectRevisions();

		const all = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
		expect(all.length).toBe(1);
		const rev1 = await revisionService().revisionNote(all, 0);
		expect(rev1.title).toBe('hello');
	}));

	it('should not create a revision for notes that get deleted if there is already a revision', (async () => {
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

	it('should not create a revision for new note the first time they are saved', (async () => {
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

	it('should abort collecting revisions when one of them is encrypted', (async () => {
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

	it('should not delete old revisions if one of them is still encrypted (1)', (async () => {
		// Test case 1: Two revisions and the first one is encrypted.
		// Calling deleteOldRevisions() with low TTL, which means all revisions
		// should be deleted, but they won't be due to the encrypted one.

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		await msleep(10);
		await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await revisionService().collectRevisions(); // REV 2
		await msleep(10);

		expect((await Revision.all()).length).toBe(2);

		const revisions = await Revision.all();
		await Revision.save({ id: revisions[0].id, encryption_applied: 1 });

		await revisionService().deleteOldRevisions(0);
		expect((await Revision.all()).length).toBe(2);

		await Revision.save({ id: revisions[0].id, encryption_applied: 0 });

		await revisionService().deleteOldRevisions(0);
		expect((await Revision.all()).length).toBe(0);
	}));

	it('should not delete old revisions if one of them is still encrypted (2)', (async () => {
		// Test case 2: Two revisions and the first one is encrypted.
		// Calling deleteOldRevisions() with higher TTL, which means the oldest
		// revision should be deleted, but it won't be due to the encrypted one.

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		const timeRev1 = Date.now();
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await revisionService().collectRevisions(); // REV 2

		expect((await Revision.all()).length).toBe(2);

		const revisions = await Revision.all();
		await Revision.save({ id: revisions[0].id, encryption_applied: 1 });

		const ttl = Date.now() - timeRev1 - 1;
		await revisionService().deleteOldRevisions(ttl);
		expect((await Revision.all()).length).toBe(2);
	}));

	it('should not delete old revisions if one of them is still encrypted (3)', (async () => {
		// Test case 2: Two revisions and the second one is encrypted.
		// Calling deleteOldRevisions() with higher TTL, which means the oldest
		// revision should be deleted, but it won't be due to the encrypted one.

		const n1_v0 = await Note.save({ title: '' });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		const timeRev1 = Date.now();
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'hello welcome' });
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

	it('should not create a revision if the note has not changed', (async () => {
		const n1_v0 = await Note.save({ title: '' });
		await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		expect((await Revision.all()).length).toBe(1);

		await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // Note has not changed (except its timestamp) so don't create a revision
		expect((await Revision.all()).length).toBe(1);
	}));

	it('should preserve user update time', (async () => {
		// user_updated_time is kind of tricky and can be changed automatically in various
		// places so make sure it is saved correctly with the revision

		const n1_v0 = await Note.save({ title: '' });
		await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		expect((await Revision.all()).length).toBe(1);

		const userUpdatedTime = Date.now() - 1000 * 60 * 60;
		await Note.save({ id: n1_v0.id, title: 'hello', updated_time: Date.now(), user_updated_time: userUpdatedTime }, { autoTimestamp: false });
		await revisionService().collectRevisions(); // Only the user timestamp has changed, but that needs to be saved

		const revisions = await Revision.all();
		expect(revisions.length).toBe(2);

		const revNote = await revisionService().revisionNote(revisions, 1);
		expect(revNote.user_updated_time).toBe(userUpdatedTime);
	}));

	it('should not create a revision if there is already a recent one', (async () => {
		const n1_v0 = await Note.save({ title: '' });
		await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		const timeRev1 = Date.now();
		const sleepTime = 500;
		await msleep(sleepTime);

		const timeRev2 = Date.now();
		await Note.save({ id: n1_v0.id, title: 'hello 2' });
		await revisionService().collectRevisions(); // REV 2
		expect((await Revision.all()).length).toBe(2);

		const interval = Date.now() - timeRev1 + sleepTime / 2;
		Setting.setValue('revisionService.intervalBetweenRevisions', interval);

		await Note.save({ id: n1_v0.id, title: 'hello 3' });
		await revisionService().collectRevisions(); // No rev because time since last rev is less than the required 'interval between revisions'
		expect(Date.now() - interval < timeRev2).toBe(true); // check the computer is not too slow for this test
		expect((await Revision.all()).length).toBe(2);
	}));

	it('should give a detailed error when a patch cannot be applied', async () => {
		const n1_v0 = await Note.save({ title: '', is_todo: 1, todo_completed: 0 });
		const n1_v1 = await Note.save({ id: n1_v0.id, title: 'hello' });
		await revisionService().collectRevisions(); // REV 1
		await msleep(100);

		await Note.save({ id: n1_v1.id, title: 'hello welcome', todo_completed: 1000 });
		await revisionService().collectRevisions(); // REV 2

		// Corrupt the metadata diff to generate the error - we assume that it's
		// been truncated for whatever reason.

		const corruptedMetadata = '{"new":{"todo_completed":10';
		const revId2 = (await Revision.all())[1].id;
		await Revision.save({ id: revId2, metadata_diff: corruptedMetadata });

		const note = await Note.load(n1_v0.id);
		let error = null;
		try {
			await revisionService().createNoteRevision_(note);
		} catch (e) {
			error = e;
		}

		expect(error).toBeTruthy();
		expect(error.message).toContain(revId2);
		expect(error.message).toContain(note.id);
		expect(error.message).toContain(corruptedMetadata);
	});

	it('note revisions should include certain required properties', async () => {
		const revisions = [
			{
				id: '2b7d7aa51f944aa5b63b8453e1182cb0',
				parent_id: '',
				item_type: 1,
				item_id: 'cc333327a8d64456a73773b13f22a1ce',
				item_updated_time: 1647101206511,
				title_diff: '[{"diffs":[[1,"hello"]],"start1":0,"start2":0,"length1":0,"length2":5}]',
				body_diff: '[]',
				metadata_diff: '{"new":{},"deleted":[]}',
				encryption_applied: 0,
				type_: 13,
			},
			{
				id: 'd2e1cd8433364bcba8e689aaa20dfef2',
				parent_id: '2b7d7aa51f944aa5b63b8453e1182cb0',
				item_type: 1,
				item_id: 'cc333327a8d64456a73773b13f22a1ce',
				item_updated_time: 1647101206622,
				title_diff: '[{"diffs":[[0,"hello"],[1," welcome"]],"start1":0,"start2":0,"length1":5,"length2":13}]',
				body_diff: '[]',
				metadata_diff: '{"new":{},"deleted":[]}',
				encryption_applied: 0,
				type_: 13,
			},
		];

		const note1 = await revisionService().revisionNote(revisions, 1);

		expect(note1.title).toBe('hello welcome');
		expect(note1.body).toBe('');
		expect(note1.markup_language).toBe(MarkupLanguage.Markdown);
		expect(note1.type_).toBe(ModelType.Note);

		// Check that it's not overidding the property if it's already set

		const revisions2 = revisions.slice();
		revisions2[0] = {
			...revisions2[0],
			metadata_diff: '{"new":{"markup_language":2},"deleted":[]}',
		};

		const note2 = await revisionService().revisionNote(revisions2, 1);
		expect(note2.markup_language).toBe(MarkupLanguage.Html);
	});

});
