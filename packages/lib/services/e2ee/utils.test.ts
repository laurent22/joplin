import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, encryptionService, expectNotThrow, expectThrow, kvStore } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { migrateMasterPassword, resetMasterPassword, showMissingMasterKeyMessage, updateMasterPassword } from './utils';
import { localSyncInfo, masterKeyById, masterKeyEnabled, setActiveMasterKeyId, setMasterKeyEnabled, setPpk } from '../synchronizer/syncInfoUtils';
import Setting from '../../models/Setting';
import { generateKeyPair, ppkPasswordIsValid } from './ppk';

describe('e2ee/utils', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
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

	it('should update the master password', async () => {
		const masterPassword1 = '111111';
		const masterPassword2 = '222222';
		Setting.setValue('encryption.masterPassword', masterPassword1);
		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey(masterPassword1));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey(masterPassword1));

		setPpk(await generateKeyPair(encryptionService(), masterPassword1));

		await updateMasterPassword(masterPassword1, masterPassword2);

		expect(Setting.value('encryption.masterPassword')).toBe(masterPassword2);
		expect(await ppkPasswordIsValid(encryptionService(), localSyncInfo().ppk, masterPassword1)).toBe(false);
		expect(await ppkPasswordIsValid(encryptionService(), localSyncInfo().ppk, masterPassword2)).toBe(true);
		expect(await encryptionService().checkMasterKeyPassword(await MasterKey.load(mk1.id), masterPassword1)).toBe(false);
		expect(await encryptionService().checkMasterKeyPassword(await MasterKey.load(mk2.id), masterPassword1)).toBe(false);
		expect(await encryptionService().checkMasterKeyPassword(await MasterKey.load(mk1.id), masterPassword2)).toBe(true);
		expect(await encryptionService().checkMasterKeyPassword(await MasterKey.load(mk2.id), masterPassword2)).toBe(true);

		await expectThrow(async () => updateMasterPassword('wrong', masterPassword1));
	});

	it('should set and verify master password when a data key exists', async () => {
		const password = '111111';

		await MasterKey.save(await encryptionService().generateMasterKey(password));

		await expectThrow(async () => updateMasterPassword('', 'wrong'));
		await expectNotThrow(async () => updateMasterPassword('', password));
		expect(Setting.value('encryption.masterPassword')).toBe(password);
	});

	it('should set and verify master password when a private key exists', async () => {
		const password = '111111';

		setPpk(await generateKeyPair(encryptionService(), password));

		await expectThrow(async () => updateMasterPassword('', 'wrong'));
		await expectNotThrow(async () => updateMasterPassword('', password));
		expect(Setting.value('encryption.masterPassword')).toBe(password);
	});

	it('should only set the master password if not already set', async () => {
		expect(localSyncInfo().ppk).toBeFalsy();
		await updateMasterPassword('', '111111');
		expect(Setting.value('encryption.masterPassword')).toBe('111111');
		expect(localSyncInfo().ppk).toBeFalsy();
		expect(localSyncInfo().masterKeys.length).toBe(0);
	});

	it('should change the master password even if no key is present', async () => {
		await updateMasterPassword('', '111111');
		expect(Setting.value('encryption.masterPassword')).toBe('111111');

		await updateMasterPassword('111111', '222222');
		expect(Setting.value('encryption.masterPassword')).toBe('222222');
	});

	it('should reset a master password', async () => {
		const masterPassword1 = '111111';
		const masterPassword2 = '222222';
		Setting.setValue('encryption.masterPassword', masterPassword1);
		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey(masterPassword1));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey(masterPassword1));
		setPpk(await generateKeyPair(encryptionService(), masterPassword1));

		const previousPpk = localSyncInfo().ppk;
		await resetMasterPassword(encryptionService(), kvStore(), null, masterPassword2);

		expect(masterKeyEnabled(masterKeyById(mk1.id))).toBe(false);
		expect(masterKeyEnabled(masterKeyById(mk2.id))).toBe(false);
		expect(localSyncInfo().ppk.id).not.toBe(previousPpk.id);
		expect(localSyncInfo().ppk.privateKey.ciphertext).not.toBe(previousPpk.privateKey.ciphertext);
		expect(localSyncInfo().ppk.publicKey).not.toBe(previousPpk.publicKey);
	});

});
