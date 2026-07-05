import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import NoteLockConfigScreen from './NoteLockConfigScreen';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import { act, fireEvent, render, screen } from '../../utils/testing/testingLibrary';
import Setting from '@joplin/lib/models/Setting';

let store: Store<AppState>;
const WrappedNoteLockConfigScreen: React.FC = () => {
	return <TestProviderStack store={store}>
		<NoteLockConfigScreen/>
	</TestProviderStack>;
};

describe('NoteLockConfigScreen', () => {
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

	test('should show the password setup form when no note lock key is set', async () => {
		const { unmount } = render(<WrappedNoteLockConfigScreen/>);

		expect(screen.getByText('Password setup')).toBeVisible();
		expect(screen.getByLabelText('Password')).toBeVisible();

		unmount();
	});

	test('should hide the setup form once a note lock key exists', async () => {
		const { unmount } = render(<WrappedNoteLockConfigScreen/>);
		expect(screen.getByLabelText('Password')).toBeVisible();

		// A note lock key appearing (created here, or arriving through sync) should flip the
		// screen out of setup mode. Seed it via save() rather than create() because the mobile
		// test crypto shim can't run real key generation.
		act(() => {
			NoteLockKey.instance().save({ id: 'test-note-lock-key' } as MasterKeyEntity);
		});

		expect(screen.queryByText('Password setup')).toBeNull();
		expect(screen.queryByLabelText('Password')).toBeNull();
		expect(screen.getByText(/Note lock password:.*Set/)).toBeVisible();

		unmount();
	});

	test('should update the auto lock setting when the switch is toggled', async () => {
		const { unmount } = render(<WrappedNoteLockConfigScreen/>);

		expect(Setting.value('noteLock.lockOnNoteSwitch')).toBe(false);
		fireEvent(screen.getByLabelText('Auto lock when switching note'), 'valueChange', true);
		expect(Setting.value('noteLock.lockOnNoteSwitch')).toBe(true);

		unmount();
	});
});
