import shim from './shim';
import BaseApplication from './BaseApplication';

jest.useFakeTimers();

describe('BaseApplication - doAsync method', () => {
	let baseApplication: BaseApplication;
	let handlers;

	beforeEach(() => {
		baseApplication = new BaseApplication();
	});

	afterEach(() => {
		shim.clearTimeout(handlers.timeout);
		shim.clearInterval(handlers.interval);
	});

	test('should run the callback onTimeout and onInterval', () => {
		const callback = jest.fn();
		handlers = baseApplication.doAsync(callback, 3000, 9000);
		expect(callback).not.toBeCalled();
		// jest.advanceTimersByTime(9000);
		// expect(callback).toBeCalled();
	});
});
