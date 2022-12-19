import { expectNotThrow, naughtyStrings, setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Note from '../models/Note';
import Revision, { ObjectPatch } from '../models/Revision';

describe('models/Revision', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should create patches of text and apply it', (async () => {
		const note1 = await Note.save({ body: 'my note\nsecond line' });

		const patch = Revision.createTextPatch(note1.body, 'my new note\nsecond line');
		const merged = Revision.applyTextPatch(note1.body, patch);

		expect(merged).toBe('my new note\nsecond line');
	}));

	it('should check if it is an empty revision', async () => {
		const testCases = [
			[false, {
				title_diff: '',
				body_diff: '',
				metadata_diff: '{"new":{"id":"aaa"},"deleted":[]}',
			}],
			[true, {
				title_diff: '',
				body_diff: '',
				metadata_diff: '',
			}],
			[true, {
				title_diff: '[]',
				body_diff: '',
				metadata_diff: '{"new":{},"deleted":[]}',
			}],
			[true, {
				title_diff: '',
				body_diff: '[]',
				metadata_diff: '{"new":{},"deleted":[]}',
			}],
			[false, {
				title_diff: '[{"diffs":[[1,"hello"]],"start1":0,"start2":0,"length1":0,"length2":5}]',
				body_diff: '[]',
				metadata_diff: '{"new":{},"deleted":[]}',
			}],
		];

		for (const t of testCases) {
			const [expected, input] = t;
			expect(Revision.isEmptyRevision(input as any)).toBe(expected);
		}
	});

	it('should not fail to create revisions on naughty strings', (async () => {
		// Previously this pattern would fail:
		// - Create a patch between an empty string and smileys
		// - Use that patch on the empty string to get back the smileys
		// - Create a patch between those smileys and new smileys
		// https://github.com/JackuB/diff-match-patch/issues/22

		const nss = await naughtyStrings();

		// First confirm that it indeed fails with the legacy approach.
		let errorCount = 0;

		for (let i = 0; i < nss.length - 1; i++) {
			const ns1 = nss[i];
			const ns2 = nss[i + 1];
			try {
				const patchText = Revision.createTextPatchLegacy('', ns1);
				const patchedText = Revision.applyTextPatchLegacy('', patchText);
				Revision.createTextPatchLegacy(patchedText, ns2);
			} catch (error) {
				errorCount++;
			}
		}

		expect(errorCount).toBe(10);

		// Now feed the naughty list again but using the new approach. In that
		// case it should work fine.
		await expectNotThrow(async () => {
			for (let i = 0; i < nss.length - 1; i++) {
				const ns1 = nss[i];
				const ns2 = nss[i + 1];
				const patchText = Revision.createTextPatch('', ns1);
				const patchedText = Revision.applyTextPatch('', patchText);
				Revision.createTextPatch(patchedText, ns2);
			}
		});
	}));

	it('should successfully handle legacy patches', async () => {
		// The code should handle applying a series of new style patches and
		// legacy patches, and the correct text should be recovered at the end.
		const changes = [
			'',
			'one',
			'one three',
			'one two three',
		];

		const patches = [
			Revision.createTextPatch(changes[0], changes[1]),
			Revision.createTextPatchLegacy(changes[1], changes[2]),
			Revision.createTextPatch(changes[2], changes[3]),
		];

		// Sanity check - verify that the patches are as expected
		expect(patches[0].substr(0, 2)).toBe('[{'); // New
		expect(patches[1].substr(0, 2)).toBe('@@'); // Legacy
		expect(patches[2].substr(0, 2)).toBe('[{'); // New

		let finalString = Revision.applyTextPatch(changes[0], patches[0]);
		finalString = Revision.applyTextPatch(finalString, patches[1]);
		finalString = Revision.applyTextPatch(finalString, patches[2]);

		expect(finalString).toBe('one two three');
	});

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

	it('should handle invalid object patch', (async () => {
		const oldObject = {
			one: '123',
			two: '456',
			three: '789',
		};

		const brokenPatch = `{"new":{"four":"444
"},"deleted":["one"]}`;

		const expected = {
			two: '456',
			three: '789',
			four: '444',
		};

		const merged = Revision.applyObjectPatch(oldObject, brokenPatch);

		expect(JSON.stringify(merged)).toBe(JSON.stringify(expected));
	}));

	it('should not strip off newlines from object values', (async () => {
		const oldObject = {
			one: '123',
			two: '456',
			three: '789',
		};

		const patch: ObjectPatch = {
			'new': {
				'four': 'one line\ntwo line',
			},
			'deleted': [],
		};

		const expected = {
			one: '123',
			two: '456',
			three: '789',
			four: 'one line\ntwo line',
		};

		const merged = Revision.applyObjectPatch(oldObject, JSON.stringify(patch));

		expect(JSON.stringify(merged)).toBe(JSON.stringify(expected));
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
			{
				patch: '',
				expected: [-0, +0],
			},
		];

		for (const test of tests) {
			const stats = Revision.patchStats(test.patch);
			expect(stats.removed).toBe(-test.expected[0]);
			expect(stats.added).toBe(test.expected[1]);
		}
	}));

});
