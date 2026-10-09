import * as React from 'react';
import { Store } from 'redux';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { finishNoteLockKeyMigration, startNoteLockKeyMigration } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';
import { NoteLockMigrationScreenComponent } from './NoteLockMigrationScreen';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { AppState } from '../../utils/types';
import { fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import BackButtonService from '../../services/BackButtonService';

jest.mock('@joplin/lib/services/noteLock/NoteLockKeyMigration', () => ({
	startNoteLockKeyMigration: jest.fn(),
	finishNoteLockKeyMigration: jest.fn(),
}));

const startMock = startNoteLockKeyMigration as jest.Mock;
const finishMock = finishNoteLockKeyMigration as jest.Mock;

let store: Store<AppState>;
const renderScreen = () => {
	const dispatch = jest.fn();
	render(
		<TestProviderStack store={store}>
			<NoteLockMigrationScreenComponent themeId={Setting.THEME_LIGHT} dispatch={dispatch}/>
		</TestProviderStack>,
	);
	fireEvent.changeText(screen.getByLabelText('Note lock password on this device'), 'local');
	fireEvent.changeText(screen.getByLabelText('Note lock password on the sync target'), 'target');
	return dispatch;
};

describe('NoteLockMigrationScreen', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		store = createMockReduxStore();
		setupGlobalStore(store);
		jest.clearAllMocks();
	});
	afterEach(() => {
		screen.unmount();
	});

	test('should go back once both passwords are accepted and leave the run to the banner', async () => {
		startMock.mockImplementation(async (_local: string, _target: string, _dispatch: unknown, onStarted: ()=> void) => onStarted());
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Migrate'));

		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'NAV_BACK' }));
		expect(startMock).toHaveBeenCalledWith('local', 'target', dispatch, expect.any(Function));
		expect(finishMock).not.toHaveBeenCalled();
	});

	test('should block going back while the passwords are checked', async () => {
		startMock.mockReturnValue(new Promise(() => {}));
		renderScreen();
		expect(screen.getByLabelText('Back')).toBeVisible();

		fireEvent.press(screen.getByText('Migrate'));

		await waitFor(() => expect(screen.queryByLabelText('Back')).toBeNull());
		expect(await BackButtonService.back()).toBe(true);
	});

	test('should not show the migration banner on its own screen', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		Setting.setValue('noteLock.conflictNoteLockKey', { noteLockKey: { id: 'target-key' }, syncMigrationId: 'lineage' });
		store = createMockReduxStore();
		setupGlobalStore(store);
		renderScreen();

		expect(screen.queryByText(/Press to migrate/)).toBeNull();
	});

	test('should report a wrong password and stay', async () => {
		startMock.mockRejectedValue(Object.assign(new Error('bad'), { name: 'OperationError' }));
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Migrate'));

		expect(await screen.findByRole('alert')).toHaveTextContent('Invalid password');
		expect(dispatch).not.toHaveBeenCalled();
	});

	test('should adopt the sync target key when skipping after the warning', async () => {
		jest.spyOn(shim, 'showConfirmationDialog').mockResolvedValue(true);
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Skip'));

		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'NAV_BACK' }));
		expect(finishMock).toHaveBeenCalled();
		expect(dispatch).toHaveBeenCalledWith({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
		expect(startMock).not.toHaveBeenCalled();
	});
});
