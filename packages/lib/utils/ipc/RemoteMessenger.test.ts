import TestMessenger from './TestMessenger';

type NumberCallback = (n: number)=> void;
type TwoNumberCallback = (arg1: number, arg2: string)=> void;
type MultiplyAndCallCallback = (a: number, callback: NumberCallback)=> Promise<void>;

interface TestApi1 {
	foo: {
		bar: (test: number, arg: string, arg2: string[])=> Promise<void>;
		multiplyAndCallCallback: MultiplyAndCallCallback;
	};
	registerCallback: (options: { callback: TwoNumberCallback })=> Promise<boolean>;
}

interface TestApi2 {
	addOne: (n: number)=> Promise<number>;
}

const testApi2Impl: TestApi2 = {
	addOne: async (n) => n + 1,
};

describe('RemoteMessenger', () => {
	it('should return API call results as promises', async () => {
		const messenger1 = new TestMessenger<TestApi2, TestApi2>('test', testApi2Impl);
		const messenger2 = new TestMessenger<TestApi2, TestApi2>('test', testApi2Impl);
		messenger1.connectTo(messenger2);

		expect(await messenger1.remoteApi.addOne(3)).toBe(4);
		expect(await messenger1.remoteApi.addOne(4)).toBe(5);
		expect(await messenger2.remoteApi.addOne(4)).toBe(5);
	});

	it('should support remote APIs with callbacks', async () => {
		const callbacks: TwoNumberCallback[] = [];
		const testApi1: TestApi1 = {
			foo: {
				bar: jest.fn(),
				multiplyAndCallCallback: jest.fn(async (n, callback) => {
					callback(n * 2);
					callback(n * 3);
				}),
			},
			registerCallback: async (options) => {
				callbacks.push(options.callback);
				return true;
			},
		};

		const api2Messenger = new TestMessenger<TestApi1, TestApi2>('test', testApi1);
		const api1Messenger = new TestMessenger<TestApi2, TestApi1>('test', testApi2Impl);
		api2Messenger.connectTo(api1Messenger);

		// Simple callback test
		expect(testApi1.foo.multiplyAndCallCallback).toHaveBeenCalledTimes(0);
		const multiplyCallback = jest.fn();
		await api1Messenger.remoteApi.foo.multiplyAndCallCallback(1, multiplyCallback);

		expect(multiplyCallback).toHaveBeenCalledTimes(2);
		expect(multiplyCallback).toHaveBeenCalledWith(2);
		expect(multiplyCallback).toHaveBeenCalledWith(3);


		// Test accessing the registerCallback method
		const registerCallbackTest = jest.fn();
		await api1Messenger.remoteApi.registerCallback({ callback: registerCallbackTest });
		expect(callbacks).toHaveLength(1);
	});

	it('should support returning an object with callbacks', async () => {
		const testApi = {
			getApi: async () => {
				return {
					multiply: async (a: number, b: number) => a * b,
					add: async (a: number, b: number) => a + b,
				};
			},
		};
		type TestApi = typeof testApi;

		const messenger1 = new TestMessenger<TestApi, TestApi>('test', testApi);
		const messenger2 = new TestMessenger<TestApi, TestApi>('test', testApi);
		messenger1.connectTo(messenger2);

		const api = await messenger1.remoteApi.getApi();
		expect(await api.multiply(2, 3)).toBe(6);
		expect(await api.add(12, 3)).toBe(15);
	});

	it('should preserve structure of transferred objects', async () => {
		const transferObjectApi = {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			transfer: async (o: any) => o,
		};
		type ApiType = typeof transferObjectApi;

		const messenger1 = new TestMessenger<ApiType, ApiType>('test', transferObjectApi);
		const messenger2 = new TestMessenger<ApiType, ApiType>('test', transferObjectApi);
		messenger1.connectTo(messenger2);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const testObjects: any[] = [
			{ foo: { bar: undefined, baz: null } },
			{ foo: { bar: [1, 2, 3], baz: 'test' } },
			{ _a: 4.5, __b: '', __callbacks: 'foo', __proto__: { a: 6 } },
		];

		for (const testObject of testObjects) {
			expect(await messenger1.remoteApi.transfer(testObject)).toMatchObject(testObject);
		}
	});

	it('should preserve the value of `this`', async () => {
		// We construct an API that intentionally relies on `this`
		const testApi = {
			async add(arg1: number, arg2: number) {
				return this._printSum(arg1 + arg2);
			},

			_printSum(sum: number) {
				return `sum: ${sum}`;
			},

			subObject: {
				async multiplyRounded(arg1: number, arg2: number) {
					return this._round(arg1) * this._round(arg2);
				},
				_round(x: number) {
					return Math.round(x);
				},
			},
		};
		type ApiType = typeof testApi;

		const messenger1 = new TestMessenger<ApiType, ApiType>('test', testApi);
		const messenger2 = new TestMessenger<ApiType, ApiType>('test', testApi);
		messenger1.connectTo(messenger2);

		const remoteApi = messenger1.remoteApi;

		// Should preserve this by default
		expect(await remoteApi.add(1, 2)).toBe('sum: 3');

		// .call and .apply should still call the function
		expect(await remoteApi.add.apply(remoteApi, [3, 2])).toBe('sum: 5');
		expect(await remoteApi.add.call(remoteApi, 3, 2)).toBe('sum: 5');

		// The same should be true for sub-objects
		expect(await remoteApi.subObject.multiplyRounded(1.1, 2)).toBe(2);
		expect(await remoteApi.subObject.multiplyRounded.call(remoteApi.subObject, 3.1, 4.2)).toBe(12);
	});

	it('should delete callbacks when dropped remotely', async () => {
		const testApi = {
			test: jest.fn(),
		};

		type ApiType = typeof testApi;
		const messenger1 = new TestMessenger<ApiType, ApiType>('testid', testApi);
		const messenger2 = new TestMessenger<ApiType, ApiType>('testid', testApi);

		messenger1.connectTo(messenger2);

		const callback = async () => {};
		messenger1.remoteApi.test(callback);

		// Callbacks should be stored with the source messenger
		const callbackId = messenger1.getIdForCallback_(callback);
		expect(callbackId).toBeTruthy();
		expect(messenger2.getIdForCallback_(callback)).toBe(undefined);

		// Dropping a callback at the remote messenger should clear the
		// callback on the original messenger
		messenger2.mockCallbackDropped(callbackId);

		// To avoid random test failure, wait for a round-tip before checking
		// whether the callback is still registered.
		await messenger1.remoteApi.test(async ()=>{});

		expect(messenger1.getIdForCallback_(callback)).toBe(undefined);
	});
});
