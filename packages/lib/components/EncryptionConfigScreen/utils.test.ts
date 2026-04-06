import '../../testing/dom-test-environment';
import MasterKey from '../../models/MasterKey';
import EncryptionService, { EncryptionMethod } from '../../services/e2ee/EncryptionService';
import { MasterKeyEntity } from '../../services/e2ee/types';
import { setActiveMasterKeyId, setEncryptionEnabled } from '../../services/synchronizer/syncInfoUtils';
import { setupDatabaseAndSynchronizer, switchClient, decryptionWorker, kvStore } from '../../testing/test-utils';
import { useInputMasterPassword, usePasswordChecker } from './utils';
import { renderHook, act, waitFor } from '@testing-library/react';
import Setting from '../../models/Setting';


interface WrappedPasswordCheckerProps {
	masterKeys: MasterKeyEntity[];
	activeMasterKeyId: string;
	masterPassword: string;
	passwords: Record<string, string>;
}

const useWrappedPasswordChecker = ({
	masterKeys = [],
	activeMasterKeyId = '',
	masterPassword = '',
	passwords = {},
}: WrappedPasswordCheckerProps) => usePasswordChecker(
	masterKeys,
	activeMasterKeyId,
	masterPassword,
	passwords,
);

describe('EncryptionConfigScreen/utils', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		setEncryptionEnabled(true);
	});

	test('should not mark keys as master password keys if the master password is incorrect for that key', async () => {
		const makeMasterKey = async (password: string) => {
			const result = await EncryptionService.instance().generateMasterKey(password, {
				encryptionMethod: EncryptionMethod.SJCL4,
			});
			return await MasterKey.save(result);
		};

		const activeMasterKey = await makeMasterKey('master-password');
		const secondaryMasterKey = await makeMasterKey('some other password');
		const masterKeys = [
			activeMasterKey,
			secondaryMasterKey,
		];

		const initialProps = {
			masterKeys,
			activeMasterKeyId: activeMasterKey.id,
			masterPassword: 'master-password',
			passwords: {
				[activeMasterKey.id]: 'master-password',
				[secondaryMasterKey.id]: 'some other password',
			},
		};
		const hook = renderHook(useWrappedPasswordChecker, {
			initialProps,
		});

		// Different password from the master password should cause the secondary key
		// to be marked as not using the master password.
		await waitFor(() => {
			const keys = hook.result.current.masterPasswordKeys;
			expect(keys[activeMasterKey.id]).toBe(true);
			expect(keys[secondaryMasterKey.id]).toBe(false);
		});

		expect(hook.result.current.masterPasswordKeys).toMatchObject({
			[activeMasterKey.id]: true,
			[secondaryMasterKey.id]: false,
		});

		// Same password as the master password but fails to decrypt: Should not be marked
		// as using the master password.
		hook.rerender({
			...initialProps,
			passwords: {
				...initialProps.passwords,
				[secondaryMasterKey.id]: 'primary',
			},
		});

		await waitFor(() => {
			const keys = hook.result.current.masterPasswordKeys;
			expect(keys[activeMasterKey.id]).toBe(true);
			expect(keys[secondaryMasterKey.id]).toBe(false);
		});

		expect(hook.result.current.masterPasswordKeys).toMatchObject({
			[activeMasterKey.id]: true,
			[secondaryMasterKey.id]: false,
		});
	});

	test('should clear blocked items and reload master key after saving a valid new master password', async () => {
		const oldPassword = 'old-password';
		const newPassword = 'new-password';

		// Create a master key with the old password
		let masterKey = await MasterKey.save(await EncryptionService.instance().generateMasterKey(oldPassword, {
			encryptionMethod: EncryptionMethod.SJCL4,
		}));
		setActiveMasterKeyId(masterKey.id);

		// Manually push the note into the blocked list in KV store,
		// simulating what happens after repeated decryption failures with the wrong password
		const worker = decryptionWorker();
		worker.setKvStore(kvStore());
		await kvStore().setValue('decrypt:1:some-note-id', 3);
		expect((await worker.decryptionDisabledItems()).length).toBe(1);

		// Simulate password change on another device: re-encrypt the master key with a new password
		const reEncrypted = await EncryptionService.instance().reencryptMasterKey(masterKey, oldPassword, newPassword);
		masterKey = await MasterKey.save(reEncrypted);
		EncryptionService.instance().unloadMasterKey(masterKey);
		Setting.setValue('encryption.masterPassword', newPassword);

		const hook = renderHook(() => useInputMasterPassword([masterKey], masterKey.id));

		await act(async () => {
			hook.result.current.onMasterPasswordChange(newPassword);
		});
		await act(async () => {
			await hook.result.current.onMasterPasswordSave();
		});

		// Blocked items should be cleared so the worker can retry them with the new password
		expect((await worker.decryptionDisabledItems()).length).toBe(0);
		// Master key should be reloaded with the new password
		expect(EncryptionService.instance().isMasterKeyLoaded(masterKey)).toBe(true);
	});
});
