import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, encryptionService } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { masterKeyEnabled, setMasterKeyEnabled } from './syncInfoUtils';

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

});
