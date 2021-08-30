import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, encryptionService, expectNotThrow } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { migrateMasterPassword, showMissingMasterKeyMessage } from './utils';
import { localSyncInfo, setActiveMasterKeyId, setMasterKeyEnabled } from '../synchronizer/syncInfoUtils';
import Setting from '../../models/Setting';

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

	it('should do the master password migration', async () => {
		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey('222222'));

		Setting.setValue('encryption.passwordCache', {
			[mk1.id]: '111111',
			[mk2.id]: '222222',
		});

		await migrateMasterPassword();

		{
			expect(Setting.value('encryption.masterPassword')).toBe('');
			const newCache = Setting.value('encryption.passwordCache');
			expect(newCache[mk1.id]).toBe('111111');
			expect(newCache[mk2.id]).toBe('222222');
		}

		setActiveMasterKeyId(mk1.id);
		await migrateMasterPassword();

		{
			expect(Setting.value('encryption.masterPassword')).toBe('111111');
			const newCache = Setting.value('encryption.passwordCache');
			expect(newCache[mk1.id]).toBe(undefined);
			expect(newCache[mk2.id]).toBe('222222');
		}
	});

});
