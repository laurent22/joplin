/* eslint-disable no-unused-vars */


const time = require('@joplinapp/lib/time').default;
const { sortedIds, createNTestNotes, asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplinapp/lib/models/Folder.js');
const Note = require('@joplinapp/lib/models/Note.js');
const Setting = require('@joplinapp/lib/models/Setting').default;
const BaseModel = require('@joplinapp/lib/BaseModel').default;
const ArrayUtils = require('@joplinapp/lib/ArrayUtils.js');
const shim = require('@joplinapp/lib/shim').default;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('database', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should not modify cached field names', asyncTest(async () => {
		const db = BaseModel.db();

		const fieldNames = db.tableFieldNames('notes');
		const fieldCount = fieldNames.length;
		fieldNames.push('type_');

		expect(fieldCount).toBeGreaterThan(0);
		expect(db.tableFieldNames('notes').length).toBe(fieldCount);
	}));

});
