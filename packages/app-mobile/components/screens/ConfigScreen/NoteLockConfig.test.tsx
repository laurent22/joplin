import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../../../utils/types';
import TestProviderStack from '../../testing/TestProviderStack';
import NoteLockConfig from './NoteLockConfig';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../../utils/testing/setupGlobalStore';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import shim from '@joplin/lib/shim';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { act, fireEvent, render, screen, waitFor } from '../../../utils/testing/testingLibrary';

let store: Store<AppState>;
const WrappedNoteLockConfig: React.FC = () => {
	return <TestProviderStack store={store}>
		<NoteLockConfig/>
	</TestProviderStack>;
};

describe('NoteLockConfig', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		NoteLockKey.destroyInstance();

		store = createMockReduxStore();
		setupGlobalStore(store);
	});
	afterEach(() => {
		screen.unmount();
		jest.restoreAllMocks();
	});

	// Seed the key via save() rather than create(): the mobile test crypto shim can't
	// run real key generation.
	const seedKey = () => act(() => {
		NoteLockKey.instance().save({ id: 'test-note-lock-key' } as MasterKeyEntity);
	});

	const fillPasswords = (newPassword: string, repeat = newPassword) => {
		fireEvent.changeText(screen.getByLabelText('New password'), newPassword);
		fireEvent.changeText(screen.getByLabelText('Repeat password'), repeat);
	};

	test('should show the password setup form only while no note lock key is set', async () => {
		const { unmount } = render(<WrappedNoteLockConfig/>);

		expect(screen.getByText('Password setup')).toBeVisible();
		expect(screen.getByLabelText('Password')).toBeVisible();

		seedKey();

		expect(screen.queryByText('Password setup')).toBeNull();
		expect(screen.queryByLabelText('Password')).toBeNull();
		expect(screen.getByText(/Note lock password:.*Set/)).toBeVisible();

		unmount();
	});

	test('should change the password once the current one is given', async () => {
		seedKey();
		const changePassword = jest.spyOn(NoteLockKey.instance(), 'changePassword').mockResolvedValue(null);
		render(<WrappedNoteLockConfig/>);

		fireEvent.press(screen.getByText('Change note lock password'));
		fillPasswords('new-pass');
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

		fireEvent.changeText(screen.getByLabelText('Current password'), 'old-pass');
		fireEvent.press(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => expect(changePassword).toHaveBeenCalledWith('old-pass', 'new-pass'));
		expect(await screen.findByText('Manage password')).toBeVisible();
	});

	test('should report a wrong current password and keep the form', async () => {
		seedKey();
		const operationError = new Error('The operation failed');
		operationError.name = 'OperationError';
		jest.spyOn(NoteLockKey.instance(), 'changePassword').mockRejectedValue(operationError);
		render(<WrappedNoteLockConfig/>);

		fireEvent.press(screen.getByText('Change note lock password'));
		fireEvent.changeText(screen.getByLabelText('Current password'), 'wrong-pass');
		fillPasswords('new-pass');
		fireEvent.press(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByText('Invalid password')).toBeVisible();
		expect(screen.getByLabelText('Current password')).toBeVisible();
	});

	test.each([true, false])('should reset the password only once the warning is confirmed (%s)', async (confirmed) => {
		seedKey();
		const showConfirmationDialog = jest.spyOn(shim, 'showConfirmationDialog').mockResolvedValue(confirmed);
		const reset = jest.spyOn(NoteLockSession.instance(), 'reset').mockResolvedValue(null);
		render(<WrappedNoteLockConfig/>);

		fireEvent.press(screen.getByText('Forgot password?'));
		fillPasswords('new-pass');
		fireEvent.press(screen.getByRole('button', { name: /Reset password/ }));

		await waitFor(() => expect(showConfirmationDialog).toHaveBeenCalled());
		if (confirmed) {
			await waitFor(() => expect(reset).toHaveBeenCalledWith('new-pass'));
		} else {
			expect(reset).not.toHaveBeenCalled();
			expect(screen.getByLabelText('New password')).toBeVisible();
		}
	});
});
