import * as React from 'react';
import * as ReactDom from 'react-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import shim from '@joplin/lib/shim';
import NoteLockMigrationDialog from './Dialog';
import { finishNoteLockKeyMigration, migrateLockedNotes } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';

jest.mock('@joplin/lib/services/noteLock/NoteLockKeyMigration', () => ({
	migrateLockedNotes: jest.fn(),
	finishNoteLockKeyMigration: jest.fn(),
}));

jest.mock('../../services/bridge', () => ({
	__esModule: true,
	default: () => ({ showConfirmMessageBox: jest.fn(() => true) }),
}));

// The dialog renders through a portal, jsdom has no modal dialog support, and DialogTitle relies on
// the React global the app bundle provides.
shim.setReactDom(ReactDom);
(globalThis as unknown as { React: typeof React }).React = React;
HTMLDialogElement.prototype.showModal = function() { this.open = true; };
HTMLDialogElement.prototype.close = function() { this.open = false; };

const migrateMock = migrateLockedNotes as jest.Mock;
const finishMock = finishNoteLockKeyMigration as jest.Mock;

const renderDialog = () => {
	const dispatch = jest.fn();
	render(<NoteLockMigrationDialog themeId={1} dispatch={dispatch}/>);
	fireEvent.change(screen.getByLabelText('Note lock password on this device'), { target: { value: 'local' } });
	fireEvent.change(screen.getByLabelText('Note lock password on the sync target'), { target: { value: 'target' } });
	return dispatch;
};

describe('NoteLockMigrationDialog/Dialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		finishMock.mockResolvedValue(0);
	});

	test('should adopt the sync target key once every note is migrated', async () => {
		migrateMock.mockResolvedValue({ migrated: 2, skipped: 0, failed: 0 });
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Migrate'));

		await waitFor(() => expect(finishMock).toHaveBeenCalled());
		expect(migrateMock).toHaveBeenCalledWith('local', 'target');
		expect(dispatch).toHaveBeenCalledWith({ type: 'DIALOG_CLOSE', name: 'noteLockMigration' });
	});

	test('should keep the local key and offer a retry when notes fail to migrate', async () => {
		migrateMock.mockResolvedValue({ migrated: 1, skipped: 0, failed: 2 });
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Migrate'));

		expect((await screen.findByRole('alert')).textContent).toContain('2 locked notes could not be migrated');
		expect(screen.getByText('Retry')).toBeTruthy();
		expect(finishMock).not.toHaveBeenCalled();
		expect(dispatch).not.toHaveBeenCalled();
	});

	test('should keep the local key and offer a retry when a note is still locked with it at the end', async () => {
		migrateMock.mockResolvedValue({ migrated: 1, skipped: 0, failed: 0 });
		finishMock.mockResolvedValue(1);
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Migrate'));

		expect((await screen.findByRole('alert')).textContent).toContain('1 locked note could not be migrated');
		expect(screen.getByText('Retry')).toBeTruthy();
		expect(dispatch).not.toHaveBeenCalled();
	});

	test('should report a wrong password without adopting anything', async () => {
		migrateMock.mockRejectedValue(Object.assign(new Error('bad'), { name: 'OperationError' }));
		renderDialog();

		fireEvent.click(screen.getByText('Migrate'));

		expect((await screen.findByRole('alert')).textContent).toContain('Invalid password');
		expect(finishMock).not.toHaveBeenCalled();
	});

	test('should adopt the sync target key when skipping after the warning', async () => {
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Skip'));

		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'DIALOG_CLOSE', name: 'noteLockMigration' }));
		expect(finishMock).toHaveBeenCalledWith(true);
		expect(migrateMock).not.toHaveBeenCalled();
	});
});
