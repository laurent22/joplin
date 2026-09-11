import * as React from 'react';
import { Store } from 'redux';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { finishNoteLockKeyMigration, migrateLockedNotes } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';
import { NoteLockMigrationScreenComponent } from './NoteLockMigrationScreen';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { AppState } from '../../utils/types';
import { fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import BackButtonService from '../../services/BackButtonService';

jest.mock('@joplin/lib/services/noteLock/NoteLockKeyMigration', () => ({
	migrateLockedNotes: jest.fn(),
	finishNoteLockKeyMigration: jest.fn(),
}));

const migrateMock = migrateLockedNotes as jest.Mock;
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
		finishMock.mockResolvedValue(0);
	});
	afterEach(() => {
		screen.unmount();
	});

	test('should adopt the sync target key and leave once every note is migrated', async () => {
		migrateMock.mockResolvedValue({ migrated: 2, skipped: 0, failed: 0 });
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Migrate'));

		await waitFor(() => expect(finishMock).toHaveBeenCalled());
		expect(migrateMock).toHaveBeenCalledWith('local', 'target');
		expect(dispatch).toHaveBeenCalledWith({ type: 'NAV_BACK' });
	});

	test('should keep the local key and offer a retry when notes fail to migrate', async () => {
		migrateMock.mockResolvedValue({ migrated: 1, skipped: 0, failed: 2 });
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Migrate'));

		expect(await screen.findByRole('alert')).toHaveTextContent(/2 locked notes could not be migrated/);
		expect(screen.getByText('Retry')).toBeVisible();
		expect(finishMock).not.toHaveBeenCalled();
		expect(dispatch).not.toHaveBeenCalled();
	});

	test('should keep the local key and offer a retry when a note is still locked with it at the end', async () => {
		migrateMock.mockResolvedValue({ migrated: 1, skipped: 0, failed: 0 });
		finishMock.mockResolvedValue(1);
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Migrate'));

		expect(await screen.findByRole('alert')).toHaveTextContent(/1 locked note could not be migrated/);
		expect(screen.getByText('Retry')).toBeVisible();
		expect(dispatch).not.toHaveBeenCalled();
	});

	test('should block going back while the migration runs', async () => {
		migrateMock.mockReturnValue(new Promise(() => {}));
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

	test('should report a wrong password without adopting anything', async () => {
		migrateMock.mockRejectedValue(Object.assign(new Error('bad'), { name: 'OperationError' }));
		renderScreen();

		fireEvent.press(screen.getByText('Migrate'));

		expect(await screen.findByRole('alert')).toHaveTextContent('Invalid password');
		expect(finishMock).not.toHaveBeenCalled();
	});

	test('should adopt the sync target key when skipping after the warning', async () => {
		jest.spyOn(shim, 'showConfirmationDialog').mockResolvedValue(true);
		const dispatch = renderScreen();

		fireEvent.press(screen.getByText('Skip'));

		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'NAV_BACK' }));
		expect(finishMock).toHaveBeenCalledWith(true);
		expect(migrateMock).not.toHaveBeenCalled();
	});
});
