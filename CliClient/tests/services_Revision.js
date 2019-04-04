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

	it('should create diff and rebuild notes', asyncTest(async () => {
		const service = new RevisionService();

		const n1_v1 = await Note.save({ title: 'hello', author: 'testing' });
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

		await time.sleep(0.5);

		await service.deleteOldRevisions(400);
		const revisions2 = await Revision.allByType(BaseModel.TYPE_NOTE, n1_v1.id);
		expect(revisions2.length).toBe(0);
	}));

});