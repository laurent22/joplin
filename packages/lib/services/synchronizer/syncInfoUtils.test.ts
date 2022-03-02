import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, encryptionService } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { masterKeyEnabled, setMasterKeyEnabled, SyncInfo, syncInfoEquals } from './syncInfoUtils';

describe('syncInfoUtils', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should enable or disable a master key', async () => {
		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));

		setMasterKeyEnabled(mk2.id, false);

		expect(masterKeyEnabled(await MasterKey.load(mk1.id))).toBe(true);
		expect(masterKeyEnabled(await MasterKey.load(mk2.id))).toBe(false);

		setMasterKeyEnabled(mk1.id, false);

		expect(masterKeyEnabled(await MasterKey.load(mk1.id))).toBe(false);
		expect(masterKeyEnabled(await MasterKey.load(mk2.id))).toBe(false);

		setMasterKeyEnabled(mk1.id, true);

		expect(masterKeyEnabled(await MasterKey.load(mk1.id))).toBe(true);
		expect(masterKeyEnabled(await MasterKey.load(mk2.id))).toBe(false);
	});

	it('should tell if two sync info are equal', async () => {
		{
			const syncInfo1 = new SyncInfo();
			const syncInfo2 = new SyncInfo();
			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(true);
		}

		{
			const syncInfo1 = new SyncInfo();
			syncInfo1.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			const syncInfo2 = new SyncInfo();
			syncInfo2.masterKeys = [{
				id: 'id',
				content: 'different',
			}];

			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(false);
		}

		{
			const syncInfo1 = new SyncInfo();
			syncInfo1.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			const syncInfo2 = new SyncInfo();
			syncInfo2.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(true);
		}

		{
			// Should disregard object key order

			const syncInfo1 = new SyncInfo();
			syncInfo1.masterKeys = [{
				content: 'content',
				id: 'id',
			}];

			const syncInfo2 = new SyncInfo();
			syncInfo2.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(true);
		}
	});

});
