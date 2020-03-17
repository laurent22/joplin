/* eslint-disable no-unused-vars */

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
		};

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

	it('should create patch stats', asyncTest(async () => {
		const tests = [
			{
				patch: `@@ -625,16 +625,48 @@
 rrupted download
+%0A- %5B %5D Fix mobile screen options`,
				expected: [-0, +32],
			},
			{
				patch: `@@ -564,17 +564,17 @@
 ages%0A- %5B
- 
+x
 %5D Check `,
				expected: [-1, +1],
			},
			{
				patch: `@@ -1022,56 +1022,415 @@
 .%0A%0A#
- How to view a note history%0A%0AWhile all the apps 
+%C2%A0How does it work?%0A%0AAll the apps save a version of the modified notes every 10 minutes.
 %0A%0A# `,
				expected: [-(19 + 27 + 2), 17 + 67 + 4],
			},
		];

		for (const test of tests) {
			const stats = Revision.patchStats(test.patch);
			expect(stats.removed).toBe(-test.expected[0]);
			expect(stats.added).toBe(test.expected[1]);
		}
	}));

});
