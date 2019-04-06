require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
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
		done();
	});

	// it('should create diff and rebuild notes', asyncTest(async () => {
	// 	const service = new RevisionService();

	// 	const n1_v1 = await Note.save({ title: 'hello', author: 'testing' });
	// 	await service.collectRevisions();
	// 	const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome', author: '' });
	// 	await service.collectRevisions();

	// 	const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
	// 	expect(revisions.length).toBe(2);
	// 	expect(revisions[1].parent_id).toBe(revisions[0].id);

	// 	const rev1 = await service.revisionNote(revisions, 0);
	// 	expect(rev1.title).toBe('hello');
	// 	expect(rev1.author).toBe('testing');

	// 	const rev2 = await service.revisionNote(revisions, 1);
	// 	expect(rev2.title).toBe('hello welcome');
	// 	expect(rev2.author).toBe('');

	// 	await time.sleep(0.5);

	// 	await service.deleteOldRevisions(400);
	// 	const revisions2 = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
	// 	expect(revisions2.length).toBe(0);
	// }));

	it('should delete old revisions', asyncTest(async () => {
		const service = new RevisionService();

		const n1_v1 = await Note.save({ title: 'hello' });
		await service.collectRevisions();
		await time.sleep(0.2);
		const n1_v2 = await Note.save({ id: n1_v1.id, title: 'hello welcome' });
		await service.collectRevisions();

		await service.deleteOldRevisions(100);
		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions.length).toBe(1);

		const rev1 = await service.revisionNote(revisions, 0);
		expect(rev1.title).toBe('hello welcome');

		// TODO: test with 3 revision, deleting oldest only
		// TODO: test with 3 revision, deleting from second
		// TODO: test with 2 notes, and 3 rev each - check at each step that other is not being deleted
	}));

	// it('should handle conflicts', asyncTest(async () => {
	// 	const service = new RevisionService();

	// 	// A conflict happens in this case:
	// 	// - Device 1 creates note1 (rev1)
	// 	// - Device 2 syncs and get note1
	// 	// - Device 1 modifies note1 (rev2)
	// 	// - Device 2 modifies note1 (rev3)
	// 	// When reconstructing the notes based on the revisions, we need to make sure it follow the right
	// 	// "path". For example, to reconstruct the note at rev2 it would be:
	// 	// rev1 => rev2
	// 	// To reconstruct the note at rev3 it would be:
	// 	// rev1 => rev3
	// 	// And not, for example, rev1 => rev2 => rev3

	// 	const n1_v1 = await Note.save({ title: 'hello' });
	// 	const noteId = n1_v1.id;
	// 	const rev1 = await service.createNoteRevision(n1_v1);
	// 	const n1_v2 = await Note.save({ id: noteId, title: 'hello Paul' });
	// 	const rev2 = await service.createNoteRevision(n1_v2, rev1.id);
	// 	const n1_v3 = await Note.save({ id: noteId, title: 'hello John' });
	// 	const rev3 = await service.createNoteRevision(n1_v3, rev1.id);

	// 	const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, noteId);
	// 	expect(revisions.length).toBe(3);
	// 	expect(revisions[1].parent_id).toBe(rev1.id);
	// 	expect(revisions[2].parent_id).toBe(rev1.id);

	// 	const revNote1 = await service.revisionNote(revisions, 0);
	// 	const revNote2 = await service.revisionNote(revisions, 1);
	// 	const revNote3 = await service.revisionNote(revisions, 2);
	// 	expect(revNote1.title).toBe('hello');
	// 	expect(revNote2.title).toBe('hello Paul');
	// 	expect(revNote3.title).toBe('hello John');
	// }));

});