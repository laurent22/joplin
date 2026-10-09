import * as React from 'react';
import * as ReactDom from 'react-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import shim from '@joplin/lib/shim';
import NoteLockMigrationDialog from './Dialog';
import { finishNoteLockKeyMigration, startNoteLockKeyMigration } from '@joplin/lib/services/noteLock/NoteLockKeyMigration';

jest.mock('@joplin/lib/services/noteLock/NoteLockKeyMigration', () => ({
	startNoteLockKeyMigration: jest.fn(),
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

const startMock = startNoteLockKeyMigration as jest.Mock;
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
	});

	test('should close once both passwords are accepted and leave the run to the banner', async () => {
		startMock.mockImplementation(async (_local: string, _target: string, _dispatch: unknown, onStarted: ()=> void) => onStarted());
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Migrate'));

		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'DIALOG_CLOSE', name: 'noteLockMigration' }));
		expect(startMock).toHaveBeenCalledWith('local', 'target', dispatch, expect.any(Function));
		expect(finishMock).not.toHaveBeenCalled();
	});

	test('should report a wrong password and stay open', async () => {
		startMock.mockRejectedValue(Object.assign(new Error('bad'), { name: 'OperationError' }));
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Migrate'));

		expect((await screen.findByRole('alert')).textContent).toContain('Invalid password');
		expect(dispatch).not.toHaveBeenCalled();
	});

	test('should adopt the sync target key when skipping after the warning', async () => {
		const dispatch = renderDialog();

		fireEvent.click(screen.getByText('Skip'));

		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'DIALOG_CLOSE', name: 'noteLockMigration' }));
		expect(finishMock).toHaveBeenCalled();
		expect(dispatch).toHaveBeenCalledWith({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
		expect(startMock).not.toHaveBeenCalled();
	});
});
