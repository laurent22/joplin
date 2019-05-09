require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
const Tag = require('lib/models/Tag.js');
const Revision = require('lib/models/Revision.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('models_Revision', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should create patches of text and apply it', asyncTest(async () => {
		const note1 = await Note.save({ body: 'my note\nsecond line' });

		const patch = Revision.createTextPatch(note1.body, 'my new note\nsecond line');
		const merged = Revision.applyTextPatch(note1.body, patch);

		expect(merged).toBe('my new note\nsecond line');
	}));

	it('should create patches of objects and apply it', asyncTest(async () => {
		const oldObject = {
			one: '123',
			two: '456',
			three: '789',
		};

		const newObject = {
			one: '123',
			three: '999',
		}

		const patch = Revision.createObjectPatch(oldObject, newObject);
		const merged = Revision.applyObjectPatch(oldObject, patch);

		expect(JSON.stringify(merged)).toBe(JSON.stringify(newObject));
	}));

	it('should move target revision to the top', asyncTest(async () => {
		const revs = [
			{ id: '123' },
			{ id: '456' },
			{ id: '789' },
		];

		let newRevs;
		newRevs = Revision.moveRevisionToTop({ id: '456' }, revs);
		expect(newRevs[0].id).toBe('123');
		expect(newRevs[1].id).toBe('789');
		expect(newRevs[2].id).toBe('456');

		newRevs = Revision.moveRevisionToTop({ id: '789' }, revs);
		expect(newRevs[0].id).toBe('123');
		expect(newRevs[1].id).toBe('456');
		expect(newRevs[2].id).toBe('789');
	}));

});