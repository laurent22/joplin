import * as React from 'react';
import { useContext } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducer, { defaultState, defaultWindowId } from '@joplin/lib/reducer';
import shim from '@joplin/lib/shim';
import PopupNotificationProvider, { PopupNotificationContext } from './PopupNotificationProvider';
import PopupNotificationList from './PopupNotificationList';
import { WindowIdContext } from '../NewWindowOrIFrame';
import { NotificationType, PopupControl } from './types';

describe('PopupNotificationProvider', () => {

	const secondaryWindowId = 'secondary';
	const setup = () => {
		const store = createStore(reducer, defaultState);
		const openSecondaryWindow = () => store.dispatch({
			type: 'WINDOW_OPEN',
			windowId: secondaryWindowId,
			folderId: 'folder',
			noteId: 'note',
			defaultAppWindowState: {},
		});
		openSecondaryWindow();
		let manager: PopupControl;
		const CaptureManager: React.FC = () => {
			manager = useContext(PopupNotificationContext);
			return null;
		};
		const rendered = render(<Provider store={store}>
			<PopupNotificationProvider>
				<CaptureManager />
				<div data-testid='main'><PopupNotificationList /></div>
				<WindowIdContext.Provider value={secondaryWindowId}>
					<div data-testid='secondary'><PopupNotificationList /></div>
				</WindowIdContext.Provider>
			</PopupNotificationProvider>
		</Provider>);
		const focusWindow = (windowId: string) => {
			act(() => { store.dispatch({ type: 'WINDOW_FOCUS', windowId }); });
		};
		const create = (message: string) => {
			let handle: ReturnType<PopupControl['createPopup']>;
			act(() => { handle = manager.createPopup(() => message, { type: NotificationType.Info }); });
			return handle;
		};
		return {
			store, manager, focusWindow, create, openSecondaryWindow,
			main: within(rendered.getByTestId('main')),
			secondary: within(rendered.getByTestId('secondary')),
			unmount: rendered.unmount,
		};
	};

	afterEach(() => {
		cleanup();
		jest.useRealTimers();
	});

	test('keeps existing toasts in their destination and sends new toasts to the current window', () => {
		const { main, secondary, create, focusWindow } = setup();
		create('Main notification');
		expect(main.getByRole('alert').textContent).toContain('Main notification');
		expect(secondary.queryByRole('alert')).toBeNull();
		focusWindow(secondaryWindowId);
		expect(main.getByRole('alert').textContent).toContain('Main notification');
		expect(secondary.queryByRole('alert')).toBeNull();
		create('Secondary notification');
		expect(secondary.getByRole('alert').textContent).toContain('Secondary notification');
		expect(main.queryByText('Secondary notification')).toBeNull();
		focusWindow(defaultWindowId);
		expect(secondary.getByRole('alert').textContent).toContain('Secondary notification');
	});

	test('discards a closed window’s notifications without restoring them when its ID is reused', () => {
		const { store, main, secondary, create, focusWindow, openSecondaryWindow } = setup();
		create('Keep main notification');
		focusWindow(secondaryWindowId);
		create('Discard secondary notification');
		act(() => { store.dispatch({ type: 'WINDOW_CLOSE', windowId: secondaryWindowId }); });
		expect(main.getByRole('alert').textContent).toContain('Keep main notification');
		expect(main.queryByText('Discard secondary notification')).toBeNull();
		expect(secondary.queryByRole('alert')).toBeNull();
		act(() => { openSecondaryWindow(); });
		focusWindow(secondaryWindowId);
		expect(secondary.queryByRole('alert')).toBeNull();
	});

	test('preserves repeated messages and newest-first ordering within each window', () => {
		const { main, secondary, create, focusWindow } = setup();
		create('First');
		create('Repeated');
		create('Repeated');
		expect(main.getAllByRole('alert').map(alert => alert.textContent)).toEqual(['Repeated', 'Repeated', 'First']);
		focusWindow(secondaryWindowId);
		create('Repeated');
		expect(secondary.getAllByRole('alert')).toHaveLength(1);
		expect(main.getAllByRole('alert')).toHaveLength(3);
	});

	test('keeps dismissal deadlines through focus changes and does not dismiss another window’s toast', async () => {
		jest.useFakeTimers();
		const { main, secondary, create, focusWindow } = setup();
		const handle = create('Expiring');
		handle.scheduleDismiss(1000);
		await act(async () => { await jest.advanceTimersByTimeAsync(500); });
		focusWindow(secondaryWindowId);
		create('Still visible');
		await act(async () => { await jest.advanceTimersByTimeAsync(500); });
		expect(main.getByRole('alert').classList.contains('-dismissing')).toBe(true);
		await act(async () => { await jest.advanceTimersByTimeAsync(600); });
		expect(main.queryByRole('alert')).toBeNull();
		expect(secondary.getByRole('alert').textContent).toContain('Still visible');
	});

	test('routes shim toasts to the last active window and restores the shim on unmount', async () => {
		jest.useFakeTimers();
		const originalShowToast = shim.showToast;
		const { main, secondary, focusWindow, unmount } = setup();
		focusWindow(secondaryWindowId);
		await act(async () => { await shim.showToast('Plugin message', { type: NotificationType.Error }); });
		expect(main.queryByRole('alert')).toBeNull();
		expect(secondary.getByRole('alert').classList.contains('-error')).toBe(true);
		await act(async () => { await jest.advanceTimersByTimeAsync(6100); });
		expect(secondary.queryByRole('alert')).toBeNull();
		unmount();
		expect(shim.showToast).toBe(originalShowToast);
	});

	test('preserves interactive notification content and the remove handle', async () => {
		jest.useFakeTimers();
		const { main, secondary, manager } = setup();
		const onCancel = jest.fn();
		let handle: ReturnType<PopupControl['createPopup']>;
		act(() => {
			handle = manager.createPopup(() => <button onClick={() => {
				onCancel();
				handle.remove();
			}}>Cancel</button>, { type: NotificationType.Success });
		});
		fireEvent.click(main.getByRole('button', { name: 'Cancel' }));
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(secondary.queryByRole('alert')).toBeNull();
		await act(async () => { await jest.advanceTimersByTimeAsync(600); });
		expect(main.queryByRole('alert')).toBeNull();
	});
});
