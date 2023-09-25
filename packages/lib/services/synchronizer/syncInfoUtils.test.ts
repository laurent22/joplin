import { afterAllCleanUp, setupDatabaseAndSynchronizer, logger, switchClient, encryptionService, msleep } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { localSyncInfo, masterKeyEnabled, mergeSyncInfos, saveLocalSyncInfo, setMasterKeyEnabled, SyncInfo, syncInfoEquals } from './syncInfoUtils';

describe('syncInfoUtils', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
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

	it('should merge sync target info and takes into account usage of master key - 1', async () => {
		const syncInfo1 = new SyncInfo();
		syncInfo1.masterKeys = [{
			id: '1',
			content: 'content1',
			hasBeenUsed: true,
		}];
		syncInfo1.activeMasterKeyId = '1';

		await msleep(1);

		const syncInfo2 = new SyncInfo();
		syncInfo2.masterKeys = [{
			id: '2',
			content: 'content2',
			hasBeenUsed: false,
		}];
		syncInfo2.activeMasterKeyId = '2';

		// If one master key has been used and the other not, it should select
		// the one that's been used regardless of timestamps.
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('1');

		// If both master keys have been used it should rely on timestamp
		// (latest modified is picked).
		syncInfo2.masterKeys[0].hasBeenUsed = true;
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('2');
	});

	it('should merge sync target info, but should not make a disabled key the active one', async () => {
		const syncInfo1 = new SyncInfo();
		syncInfo1.masterKeys = [{
			id: '1',
			content: 'content1',
			hasBeenUsed: true,
			enabled: 0,
		}];
		syncInfo1.activeMasterKeyId = '1';

		await msleep(1);

		const syncInfo2 = new SyncInfo();
		syncInfo2.masterKeys = [{
			id: '2',
			content: 'content2',
			enabled: 1,
			hasBeenUsed: false,
		}];
		syncInfo2.activeMasterKeyId = '2';

		// Normally, if one master key has been used (1) and the other not (2),
		// it should select the one that's been used regardless of timestamps.
		// **However**, if the key 1 has been disabled by user, it should
		// **not** be picked as the active one. Instead it should use key 2,
		// because it's still enabled.
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('2');

		// If both key are disabled, we go back to the original logic, where we
		// select the key that's been used.
		syncInfo2.masterKeys[0].enabled = 0;
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('1');
	});

	it('should fix the sync info if it contains invalid data', async () => {
		logger.enabled = false;

		const syncInfo = new SyncInfo();
		syncInfo.masterKeys = [{
			id: '1',
			content: 'content1',
			hasBeenUsed: true,
			enabled: 0,
		}];
		syncInfo.activeMasterKeyId = '2';

		saveLocalSyncInfo(syncInfo);

		const loaded = localSyncInfo();
		expect(loaded.activeMasterKeyId).toBe('');
		expect(loaded.masterKeys.length).toBe(1);

		logger.enabled = true;
	});

});
