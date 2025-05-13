import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import EncryptionConfig from './encryption-config';
import { loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { getActiveMasterKeyId, setEncryptionEnabled, setMasterKeyEnabled } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { act, render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

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

		store = createMockReduxStore();
		setupGlobalStore(store);
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
});
