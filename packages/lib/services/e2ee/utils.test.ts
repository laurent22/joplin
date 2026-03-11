import { masterPasswordIsValid } from './utils';
import Setting from '../../models/Setting';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';
import { setupDatabaseAndSynchronizer, encryptionService, switchClient } from '../../testing/test-utils';

describe('e2ee/utils', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('encryption.masterPassword', '');
	});

	it('masterPasswordIsValid should reject wrong password when encrypted data exists but master password is cleared', async () => {
		// This tests the bug fix for #14695:
		// When user clears master password and re-enables encryption,
		// the system should validate against existing master keys, not accept any password

		const service = encryptionService();
		const correctPassword = 'mySecretPassword123';
		const wrongPassword = 'wrongPassword456';

		// Generate a real master key with the correct password
		const masterKey = await service.generateMasterKey(correctPassword);

		// Set it in sync info (simulating existing encrypted data)
		const syncInfo = localSyncInfo();
		syncInfo.masterKeys = [masterKey];
		saveLocalSyncInfo(syncInfo);

		// Clear the master password setting (simulating user clicking "Clear master password")
		Setting.setValue('encryption.masterPassword', '');

		// Wrong password should be rejected
		const wrongResult = await masterPasswordIsValid(wrongPassword);
		expect(wrongResult).toBe(false);

		// Correct password should be accepted
		const correctResult = await masterPasswordIsValid(correctPassword);
		expect(correctResult).toBe(true);
	});

	it('masterPasswordIsValid should accept any password when no encrypted data exists', async () => {
		// First-time setup: no encrypted data, no master password set
		const syncInfo = localSyncInfo();
		syncInfo.masterKeys = [];
		syncInfo.ppk = null;
		saveLocalSyncInfo(syncInfo);

		Setting.setValue('encryption.masterPassword', '');

		// Any password should be accepted
		const result = await masterPasswordIsValid('anyPassword');
		expect(result).toBe(true);
	});

	it('masterPasswordIsValid should throw error when password is empty', async () => {
		await expect(masterPasswordIsValid('')).rejects.toThrow('Password is empty');
	});
});
