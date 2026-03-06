import { renderHook } from '@testing-library/react';
import Setting from '@joplin/lib/models/Setting';
import useCtrlWheelZoom from './useCtrlWheelZoom';

jest.mock('@joplin/lib/models/Setting', () => ({
	__esModule: true,
	default: {
		incValue: jest.fn(),
	},
}));

describe('useCtrlWheelZoom', () => {

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should zoom in on Ctrl+WheelUp', () => {
		renderHook(() => useCtrlWheelZoom());

		const event = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true });
		const preventSpy = jest.spyOn(event, 'preventDefault');
		document.dispatchEvent(event);

		expect(preventSpy).toHaveBeenCalled();
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);
	});

	test('should zoom out on Ctrl+WheelDown', () => {
		renderHook(() => useCtrlWheelZoom());

		const event = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true });
		const preventSpy = jest.spyOn(event, 'preventDefault');
		document.dispatchEvent(event);

		expect(preventSpy).toHaveBeenCalled();
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', -10);
	});

	test('should zoom on Meta+Wheel (macOS)', () => {
		renderHook(() => useCtrlWheelZoom());

		const event = new WheelEvent('wheel', { deltaY: -100, metaKey: true, bubbles: true });
		document.dispatchEvent(event);

		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);
	});

	test('should not zoom on wheel without modifier', () => {
		renderHook(() => useCtrlWheelZoom());

		const event = new WheelEvent('wheel', { deltaY: -100, bubbles: true });
		const preventSpy = jest.spyOn(event, 'preventDefault');
		document.dispatchEvent(event);

		expect(preventSpy).not.toHaveBeenCalled();
		expect(Setting.incValue).not.toHaveBeenCalled();
	});

	test('should remove listener on unmount', () => {
		const removeSpy = jest.spyOn(document, 'removeEventListener');
		const { unmount } = renderHook(() => useCtrlWheelZoom());

		unmount();

		expect(removeSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
		removeSpy.mockRestore();
	});
});
