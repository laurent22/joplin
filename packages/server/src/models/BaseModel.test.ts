import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';

describe('BaseModel', () => {

	beforeAll(async () => {
		await beforeAllDb('BaseModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should check if a user has replication', async () => {
		// cSpell:disable
		const itemModel = models().item();
		itemModel.usersWithReplication_ = ['A', 'B', 'EYE1m66mGmA01sDDDDKE19'];
		expect(itemModel.isUserWithReplication('AAAAAAAAAAAA')).toBe(true);
		expect(itemModel.isUserWithReplication('AAAAAAAAAAAAEEEEEEE')).toBe(true);
		expect(itemModel.isUserWithReplication('bbbbbbbb')).toBe(false);
		expect(itemModel.isUserWithReplication('BBBBBBBBBB')).toBe(true);
		expect(itemModel.isUserWithReplication('')).toBe(false);
		expect(itemModel.isUserWithReplication('EYE1m66mGmA01sDDDDKE19')).toBe(true);
		// cSpell:enable
	});

});
