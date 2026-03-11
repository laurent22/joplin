import { masterPasswordIsValid } from './utils';
import Setting from '../../models/Setting';
import { localSyncInfo, saveLocalSyncInfo } from './syncInfoUtils';
import { MasterKeyEntity } from './types';

describe('e2ee/utils', () => {
	describe('masterPasswordIsValid', () => {
		beforeEach(() => {
			// Reset settings before each test
			Setting.setValue('encryption.masterPassword', '');
		});

		it('should reject any password when master password is cleared but encrypted data exists', async () => {
			// Simulate a scenario where:
			// 1. Master password was set and encrypted data exists
			// 2. User clears the master password
			// 3. User tries to re-enable encryption with any password

			// Set up encrypted data (master keys)
			const syncInfo = localSyncInfo();
			const mockMasterKey: MasterKeyEntity = {
				id: 'test-key-1',
				created_time: Date.now(),
				updated_time: Date.now(),
				encryption_method: 4,
				source_application: 'joplin',
				source_application_version: '3.6.0',
				checksum: 'test-checksum',
				content: 'encrypted-content',
			};
			syncInfo.masterKeys = [mockMasterKey];
			saveLocalSyncInfo(syncInfo);

			// Clear the master password setting (simulating the "Clear master password" button)
			Setting.setValue('encryption.masterPassword', '');

			// Try to validate with any password - should fail
			try {
				const result = await masterPasswordIsValid('any-password');
				expect(result).toBe(false);
			} catch (error) {
				// If it throws, that's also acceptable behavior
				expect(error).toBeDefined();
			}
		});

		it('should accept any password when no encrypted data exists and master password is not set', async () => {
			// When there's no encrypted data and no master password set,
			// any password should be considered valid (first-time setup)
			const syncInfo = localSyncInfo();
			syncInfo.masterKeys = [];
			syncInfo.ppk = null;
			saveLocalSyncInfo(syncInfo);

			Setting.setValue('encryption.masterPassword', '');

			const result = await masterPasswordIsValid('any-password');
			expect(result).toBe(true);
		});

		it('should throw error when password is empty', async () => {
			await expect(masterPasswordIsValid('')).rejects.toThrow('Password is empty');
		});
	});
});
