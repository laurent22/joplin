const { setupDatabaseAndSynchronizer, switchClient } = require('./testing/test-utils.js');
const BaseModel = require('./BaseModel').default;

describe('database', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
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
