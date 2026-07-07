import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import NoteLockConfig from './NoteLockConfig';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { act, fireEvent, render, screen } from '../../utils/testing/testingLibrary';
import Setting from '@joplin/lib/models/Setting';

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
	});

	test('should show the password setup form only while no note lock key is set', async () => {
		const { unmount } = render(<WrappedNoteLockConfig/>);

		expect(screen.getByText('Password setup')).toBeVisible();
		expect(screen.getByLabelText('Password')).toBeVisible();

		// Seed the key via save() rather than create(): the mobile test crypto shim can't
		// run real key generation.
		act(() => {
			NoteLockKey.instance().save({ id: 'test-note-lock-key' } as MasterKeyEntity);
		});

		expect(screen.queryByText('Password setup')).toBeNull();
		expect(screen.queryByLabelText('Password')).toBeNull();
		expect(screen.getByText(/Note lock password:.*Set/)).toBeVisible();

		unmount();
	});

	test('should update the auto lock setting when the switch is toggled', async () => {
		const { unmount } = render(<WrappedNoteLockConfig/>);

		expect(Setting.value('noteLock.lockOnNoteSwitch')).toBe(false);
		fireEvent(screen.getByLabelText('Auto lock when switching note'), 'valueChange', true);
		expect(Setting.value('noteLock.lockOnNoteSwitch')).toBe(true);

		unmount();
	});
});
