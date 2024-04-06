import separateCallbacksFromSerializable from './separateCallbacksFromSerializable';

describe('separateCallbacksFromSerializable', () => {
	test('should separate callbacks from serializable data for a single callback', () => {
		const testCallback = async () => {};
		const separated = separateCallbacksFromSerializable(testCallback);

		// A callback is not serializable (convertible to JSON)
		expect(separated.serializableData).toBe(null);

		// callbacks should point to the ID of testCallback
		expect(typeof separated.callbacks).toBe('string');
		const callbackId = separated.callbacks as string;

		expect(Object.keys(separated.idToCallbacks)).toHaveLength(1);
		expect(separated.idToCallbacks[callbackId]).toBe(testCallback);
	});

	test('should assign callback IDs for an array of mixed callbacks and values', async () => {
		const originalData = [
			async () => {},
			'Test',
			{ test: 2, test2: 3 },
			async () => 4,
		];
		const separated = separateCallbacksFromSerializable(originalData);

		expect(separated.serializableData).toMatchObject([
			null,
			'Test',
			{ test: 2, test2: 3 },
			null,
		]);

		expect(Array.isArray(separated.callbacks)).toBe(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const callbackArray = separated.callbacks as any[];

		// Should have assigned IDs to the two functions
		expect(callbackArray[0]).not.toBeFalsy();
		expect(callbackArray[3]).not.toBeFalsy();

		// Should be possible to call a function from the original with an ID
		await expect(separated.idToCallbacks[callbackArray[3]]()).resolves.toBe(4);
	});
});
