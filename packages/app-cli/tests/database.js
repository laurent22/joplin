/* eslint-disable no-unused-vars */


const time = require('@joplin/lib/time').default;
const { sortedIds, createNTestNotes, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;
const Setting = require('@joplin/lib/models/Setting').default;
const BaseModel = require('@joplin/lib/BaseModel').default;
const ArrayUtils = require('@joplin/lib/ArrayUtils.js');
const shim = require('@joplin/lib/shim').default;

describe('database', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should not modify cached field names', (async () => {
		const db = BaseModel.db();

		const fieldNames = db.tableFieldNames('notes');
		const fieldCount = fieldNames.length;
		fieldNames.push('type_');

		expect(fieldCount).toBeGreaterThan(0);
		expect(db.tableFieldNames('notes').length).toBe(fieldCount);
	}));

});
