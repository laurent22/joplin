import mergeCallbacksAndSerializable from './mergeCallbacksAndSerializable';

describe('mergeCallbacksAndSerializable', () => {
	test('should create functions from given callback IDs while preserving values', () => {
		const callbacks = {
			foo: {
				fn1: 'some-id-here',
				fn2: 'another-id-here',
			},
			test: [
				'test[0]',
				undefined,
				'test[2]',
			],
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const data: any = {
			foo: {
				fn1: undefined,
				fn2: undefined,
				value1: 1,
			},
			test: [
				undefined,
				'Test',
				undefined,
			],
		};

		const callMethodWithId = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const merged: any = mergeCallbacksAndSerializable(data, callbacks, callMethodWithId, ()=>{});

		// Should have created functions
		merged.foo.fn1(3, 4);
		expect(callMethodWithId).toHaveBeenLastCalledWith('some-id-here', [3, 4]);
		merged.foo.fn2();
		expect(callMethodWithId).toHaveBeenLastCalledWith('another-id-here', []);
		merged.test[2]();
		expect(callMethodWithId).toHaveBeenLastCalledWith('test[2]', []);

		// Should have preserved values
		expect(merged.test[1]).toBe('Test');
		expect(merged.foo.value1).toBe(1);
	});
});
