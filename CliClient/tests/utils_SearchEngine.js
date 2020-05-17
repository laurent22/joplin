/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, asyncTest, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, ids, sortedIds, createNTestFolders, createNTestNotes } = require('test-utils.js');

const SearchEngine = require('lib/services/SearchEngine');
const SearchEngineUtils = require('lib/services/SearchEngineUtils');
const Tag = require('lib/models/Tag.js');
const Note = require('lib/models/Note');
const { ALL_NOTES_FILTER_ID, TRASH_FILTER_ID, TRASH_TAG_ID, TRASH_TAG_NAME } = require('lib/reserved-ids.js');

let engine = null;

describe('utils_SearchEngine', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = SearchEngine.instance();
		engine.setDb(db());
		done();
	});

	afterEach(async (done) => {
		engine.setDb(null);
		SearchEngine.instance_ = null;
		done();
	});

	it('should not include filtered notes in query results', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// setup
		const folders = await createNTestFolders(1);
		const notes1 = await createNTestNotes(1, folders[0].id, null, 'NOTE');
		const notes2 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID], 'NOTE');
		const notes3 = await createNTestNotes(1, folders[0].id, null, 'NOTE');
		const notes4 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID], 'NOTE');

		await engine.syncTables();

		const result = await SearchEngineUtils.notesForQuery('title:NOTE');
		expect(sortedIds(result)).toEqual(sortedIds([notes1[0], notes3[0]]));
	}));

});
