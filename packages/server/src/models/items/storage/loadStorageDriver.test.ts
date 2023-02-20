import { afterAllTests, beforeAllDb, beforeEachDb, db, expectThrow, models } from '../../../utils/testing/testUtils';
import { StorageDriverType } from '../../../utils/types';
import loadStorageDriver from './loadStorageDriver';

describe('loadStorageDriver', () => {

	beforeAll(async () => {
		await beforeAllDb('loadStorageDriver');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should load a driver and assign an ID to it', async () => {
		{
			const newDriver = await loadStorageDriver({ type: StorageDriverType.Memory }, db());
			expect(newDriver.storageId).toBe(1);
			expect((await models().storage().count())).toBe(1);
		}

		{
			const newDriver = await loadStorageDriver({ type: StorageDriverType.Filesystem, path: '/just/testing' }, db());
			expect(newDriver.storageId).toBe(2);
			expect((await models().storage().count())).toBe(2);
		}
	});

	test('should not record the same storage connection twice', async () => {
		await db()('storages').insert({
			connection_string: 'Type=Database',
			updated_time: Date.now(),
			created_time: Date.now(),
		});

		await expectThrow(async () =>
			await db()('storages').insert({
				connection_string: 'Type=Database',
				updated_time: Date.now(),
				created_time: Date.now(),
			})
		);
	});

});

