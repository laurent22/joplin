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

	test('should zoom on Ctrl/Meta+Wheel', () => {
		renderHook(() => useCtrlWheelZoom());

		// Ctrl+WheelUp → zoom in
		document.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true }));
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);

		jest.clearAllMocks();

		// Ctrl+WheelDown → zoom out
		document.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true }));
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', -10);

		jest.clearAllMocks();

		// Meta+WheelUp → zoom in (macOS)
		document.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, metaKey: true, bubbles: true }));
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);
	});

	test('should not zoom on wheel without modifier', () => {
		renderHook(() => useCtrlWheelZoom());

		document.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));

		expect(Setting.incValue).not.toHaveBeenCalled();
	});
});
