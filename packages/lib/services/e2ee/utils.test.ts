import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, encryptionService, expectNotThrow } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { showMissingMasterKeyMessage } from './utils';
import { localSyncInfo, setMasterKeyEnabled } from '../synchronizer/syncInfoUtils';

describe('e2ee/utils', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should tell if the missing master key message should be shown', async () => {
		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));

		expect(showMissingMasterKeyMessage(localSyncInfo(), [mk1.id])).toBe(true);
		expect(showMissingMasterKeyMessage(localSyncInfo(), [mk1.id, mk2.id])).toBe(true);
		expect(showMissingMasterKeyMessage(localSyncInfo(), [])).toBe(false);

		setMasterKeyEnabled(mk1.id, false);
		expect(showMissingMasterKeyMessage(localSyncInfo(), [mk1.id])).toBe(false);
		expect(showMissingMasterKeyMessage(localSyncInfo(), [mk1.id, mk2.id])).toBe(true);

		setMasterKeyEnabled(mk2.id, false);
		expect(showMissingMasterKeyMessage(localSyncInfo(), [mk1.id, mk2.id])).toBe(false);

		setMasterKeyEnabled(mk1.id, true);
		setMasterKeyEnabled(mk2.id, true);
		expect(showMissingMasterKeyMessage(localSyncInfo(), [mk1.id, mk2.id])).toBe(true);

		await expectNotThrow(async () => showMissingMasterKeyMessage(localSyncInfo(), ['not_downloaded_yet']));

		const syncInfo = localSyncInfo();
		syncInfo.masterKeys = [];
		expect(showMissingMasterKeyMessage(syncInfo, [mk1.id, mk2.id])).toBe(false);
	});

});
