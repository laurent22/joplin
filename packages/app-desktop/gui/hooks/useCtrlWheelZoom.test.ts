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

describe('useCtrlWheelZoom', () => {

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should zoom on Ctrl/Meta+Wheel', () => {
		renderHook(() => useCtrlWheelZoom());

		dispatchWheel({ deltaY: -100, ctrlKey: true });
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);

		jest.clearAllMocks();

		dispatchWheel({ deltaY: 100, ctrlKey: true });
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', -10);

		jest.clearAllMocks();

		dispatchWheel({ deltaY: -100, metaKey: true });
		expect(Setting.incValue).toHaveBeenCalledWith('windowContentZoomFactor', 10);
	});

	test('should not zoom on wheel without modifier', () => {
		renderHook(() => useCtrlWheelZoom());

		dispatchWheel({ deltaY: -100 });

		expect(Setting.incValue).not.toHaveBeenCalled();
	});
});
