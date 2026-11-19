import '../../../../testing/dom-test-environment';
import { act, renderHook } from '@testing-library/react';
import usePpkValidityChecker from './usePpkValidityChecker';
import { MasterPasswordStatus } from '../../../../services/e2ee/utils';
import { generateKeyPair, ppkPasswordIsValid } from '../../../../services/e2ee/ppk/ppk';
import { encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient } from '../../../../testing/test-utils';
import { localSyncInfo, saveLocalSyncInfo } from '../../../../services/synchronizer/syncInfoUtils';
import Setting from '../../../../models/Setting';
import { reg } from '../../../../registry';

describe('usePpkValidityChecker', () => {
	const scheduleSyncMock = jest.fn();
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('encryption.masterPassword', '123456');
		await loadEncryptionMasterKey();

		scheduleSyncMock.mockClear();
		reg.scheduleSync = scheduleSyncMock;
	});

	test.each([
		{ ppkPassword: '123456', passwordStatus: MasterPasswordStatus.Valid },
		// A replaced key pair, encrypted with a password the user doesn't know
		{ ppkPassword: 'other-password', passwordStatus: MasterPasswordStatus.Invalid },
	])('onResetPpk should regenerate the sync info\'s ppk (ppk password: $ppkPassword)', async ({ ppkPassword, passwordStatus }) => {
		const originalPpk = await generateKeyPair(encryptionService(), ppkPassword);
		const originalSyncInfo = localSyncInfo();
		originalSyncInfo.ppk = originalPpk;
		saveLocalSyncInfo(originalSyncInfo);

		const invalidRemotePpk = true;
		const dispatch = jest.fn();

		const useTestHook = () => {
			return usePpkValidityChecker({
				dispatch,
				password: '123456',
				passwordStatus,
				ppk: originalPpk,
				invalidPpk: invalidRemotePpk,
			});
		};

		const hook = renderHook(useTestHook);
		expect(hook.result.current.valid).toBe(false);

		await act(async () => {
			await hook.result.current.onResetPpk();
		});
		hook.unmount();

		expect(localSyncInfo().ppk.createdTime).toBeGreaterThan(originalPpk.createdTime);
		expect(await ppkPasswordIsValid(encryptionService(), localSyncInfo().ppk, '123456')).toBe(true);

		// Should also schedule a sync to upload the new PPK
		expect(scheduleSyncMock).toHaveBeenCalled();
	});
});
