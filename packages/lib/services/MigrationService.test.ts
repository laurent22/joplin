import MasterKey from '../models/MasterKey';
import Setting from '../models/Setting';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import MigrationService from './MigrationService';
import { setActiveMasterKeyId, setEncryptionEnabled, SyncTargetInfo } from './synchronizer/syncTargetInfoUtils';

function migrationService() {
	return new MigrationService();
}

describe('MigrationService', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should migrate to v40 - with keys', async () => {
		const startTime = Date.now();

		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey('1'));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey('2'));
		setEncryptionEnabled(true);
		setActiveMasterKeyId(mk2.id);

		await migrationService().runScript(40);

		const info: SyncTargetInfo = JSON.parse(Setting.value('sync.info'));
		expect(info.e2ee).toBe(true);
		expect(info.activeMasterKeyId).toBe(mk2.id);
		expect(info.version).toBe(2);
		expect(Object.keys(info.masterKeys).sort()).toEqual([mk1.id, mk2.id].sort());
		expect(info.updatedTime).toBeGreaterThanOrEqual(startTime);
	});

	it('should migrate to v40 - empty', async () => {
		const startTime = Date.now();

		await migrationService().runScript(40);

		const info: SyncTargetInfo = JSON.parse(Setting.value('sync.info'));
		expect(info.e2ee).toBe(false);
		expect(info.activeMasterKeyId).toBe('');
		expect(info.version).toBe(2);
		expect(Object.keys(info.masterKeys)).toEqual([]);
		expect(info.updatedTime).toBeGreaterThanOrEqual(startTime);
	});

});
