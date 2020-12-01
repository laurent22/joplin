/* eslint-disable no-unused-vars */


const time = require('@joplin/lib/time').default;
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const NoteTag = require('@joplin/lib/models/NoteTag.js');
const Tag = require('@joplin/lib/models/Tag.js');
const Revision = require('@joplin/lib/models/Revision.js');
const BaseModel = require('@joplin/lib/BaseModel').default;
const shim = require('@joplin/lib/shim').default;

describe('models_Revision', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should create patches of text and apply it', (async () => {
		const note1 = await Note.save({ body: 'my note\nsecond line' });

		const patch = Revision.createTextPatch(note1.body, 'my new note\nsecond line');
		const merged = Revision.applyTextPatch(note1.body, patch);

		expect(merged).toBe('my new note\nsecond line');
	}));

	it('should create patches of objects and apply it', (async () => {
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

	it('should move target revision to the top', (async () => {
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

	it('should create patch stats', (async () => {
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
