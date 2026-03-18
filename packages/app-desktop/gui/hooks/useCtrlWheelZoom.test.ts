import { renderHook } from '@testing-library/react';
import Setting from '@joplin/lib/models/Setting';
import useCtrlWheelZoom from './useCtrlWheelZoom';

jest.mock('@joplin/lib/models/Setting', () => ({
	__esModule: true,
	default: {
		incValue: jest.fn(),
	},
}));

const dispatchWheel = (options: WheelEventInit) => {
	document.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ...options }));
};

const dispatchKeyDown = (key: string) => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

const dispatchKeyUp = (key: string) => {
	document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
};

describe('useCtrlWheelZoom', () => {

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should zoom when Ctrl key is pressed and wheel is scrolled', () => {
		renderHook(() => useCtrlWheelZoom());

		dispatchKeyDown('Control');
		dispatchWheel({ deltaY: -100 });
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);

		jest.clearAllMocks();

		dispatchWheel({ deltaY: 100 });
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', -10);

		dispatchKeyUp('Control');
	});

	test('should zoom when Meta key is pressed and wheel is scrolled', () => {
		renderHook(() => useCtrlWheelZoom());

		dispatchKeyDown('Meta');
		dispatchWheel({ deltaY: -100 });
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);

		dispatchKeyUp('Meta');
	});

	test('should not zoom on wheel without modifier key pressed', () => {
		renderHook(() => useCtrlWheelZoom());

		dispatchWheel({ deltaY: -100 });
		expect(Setting.incValue).not.toHaveBeenCalled();
	});

	test('should not zoom when only ctrlKey flag is set on wheel event (trackpad pinch)', () => {
		// On macOS, trackpad pinch gestures send wheel events with ctrlKey=true
		// but without actually pressing the Ctrl key
		renderHook(() => useCtrlWheelZoom());

		dispatchWheel({ deltaY: -100, ctrlKey: true });
		expect(Setting.incValue).not.toHaveBeenCalled();
	});

	test('should stop zooming after key is released', () => {
		renderHook(() => useCtrlWheelZoom());

		dispatchKeyDown('Control');
		dispatchWheel({ deltaY: -100 });
		expect(Setting.incValue).toHaveBeenCalledTimes(1);

		jest.clearAllMocks();

		dispatchKeyUp('Control');
		dispatchWheel({ deltaY: -100 });
		expect(Setting.incValue).not.toHaveBeenCalled();
	});
});
