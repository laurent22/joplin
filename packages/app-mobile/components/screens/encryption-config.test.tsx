import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import EncryptionConfig from './encryption-config';
import { encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { getActiveMasterKeyId, localSyncInfo, saveLocalSyncInfo, setEncryptionEnabled, setMasterKeyEnabled } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { act, fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import Setting from '@joplin/lib/models/Setting';
import { formatPublicKeyFingerprint, generateKeyPair, isPublicPrivateKeyPairValid, ppkPublicKeyFingerprint } from '@joplin/lib/services/e2ee/ppk/ppk';
import { reg } from '@joplin/lib/registry';
import { Minute, Second } from '@joplin/utils/time';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';

interface WrapperProps { }

let store: Store<AppState>;
const WrappedEncryptionConfigScreen: React.FC<WrapperProps> = _props => {
	return <TestProviderStack store={store}>
		<EncryptionConfig/>
	</TestProviderStack>;
};

describe('encryption-config', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();
		const password = '123456';
		Setting.setValue('encryption.masterPassword', password);

		store = createMockReduxStore();
		setupGlobalStore(store);

		// Prevent scheduled syncs from running after tests finish
		reg.scheduleSync = jest.fn();
	});
	afterEach(() => {
		screen.unmount();
	});

	test('should show an input for entering the master password after an initial sync', async () => {
		// Switch to the other client and sync so that there's a master key missing
		// a password
		await synchronizerStart();
		await switchClient(1);
		await synchronizerStart();

		const { unmount } = render(<WrappedEncryptionConfigScreen/>);

		// Should auto-enable encryption
		expect(screen.getByText('Encryption is: Enabled')).toBeVisible();
		const passwordInput = screen.getByLabelText(/The master password is not set/);
		expect(passwordInput).toBeVisible();

		// Unmount here to prevent "An update to EncryptionConfigScreen inside a test was not wrapped in act(...)"
		// errors
		unmount();
	});

	test('should not show the "disabled keys" dropdown unless there are disabled keys', async () => {
		const masterKeyId = getActiveMasterKeyId();
		setMasterKeyEnabled(masterKeyId, false);

		const { unmount } = render(<WrappedEncryptionConfigScreen/>);

		const queryDisabledKeysButton = () => screen.queryByRole('button', { name: 'Disabled keys' });

		// Should be visible when there are disabled keys
		expect(queryDisabledKeysButton()).toBeVisible();

		// Enabling the key should hide the button
		act(() => setMasterKeyEnabled(masterKeyId, true));
		expect(queryDisabledKeysButton()).toBeNull();

		unmount();
	});

	test('should only show the public key fingerprint when syncing with Joplin Server and the master password is valid', async () => {
		const joplinServerId = SyncTargetRegistry.nameToId('joplinServer');
		Setting.setValue('sync.target', joplinServerId);

		const syncInfo = localSyncInfo();
		syncInfo.ppk = await generateKeyPair(encryptionService(), '123456');
		saveLocalSyncInfo(syncInfo);

		const { unmount } = render(<WrappedEncryptionConfigScreen/>);

		const fingerprint = formatPublicKeyFingerprint(await act(() => ppkPublicKeyFingerprint(syncInfo.ppk)));
		// Checking the password takes several seconds in tests, and blocks the event loop. If waitFor's timeout is shorter,
		// it can fire before the screen updates.
		await waitFor(() => {
			const fingerprintLabel = screen.getByText(fingerprint);
			expect(fingerprintLabel).toBeVisible();
		}, { timeout: Second * 45 });

		// Should hide the fingerprint when the password is invalid (since a password is required to check that an attacker hasn't
		// swapped the PPK public key)
		await withWarningSilenced(/invalid password/, async () => {
			act(() => Setting.setValue('encryption.masterPassword', 'invalid!'));
			await waitFor(() => {
				const fingerprintLabel = screen.queryByText(fingerprint);
				expect(fingerprintLabel).toBe(null);
			}, { timeout: Second * 45 });
		});

		unmount();
	});

	test('should allow resetting an invalid PPK', async () => {
		const password = '123456';
		const ppk1 = await generateKeyPair(encryptionService(), password);
		const ppk2 = await generateKeyPair(encryptionService(), password);

		const syncInfo = localSyncInfo();
		syncInfo.ppk = {
			...ppk1,
			publicKey: ppk2.publicKey,
		};
		saveLocalSyncInfo(syncInfo);

		expect(await isPublicPrivateKeyPairValid(encryptionService(), syncInfo.ppk, password)).toBe(false);

		const { unmount } = render(<WrappedEncryptionConfigScreen/>);

		const queryResetPpkButton = () => screen.queryByRole('button', { name: 'Regenerate key pair' });

		await waitFor(() => {
			expect(queryResetPpkButton()).toBeVisible();
			expect(queryResetPpkButton()).toBeEnabled();
		}, { timeout: Minute });

		fireEvent.press(queryResetPpkButton());
		await waitFor(() => {
			expect(queryResetPpkButton()).toBeNull();
		}, { timeout: Minute });

		unmount();
	});
});
