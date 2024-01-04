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
		const resgisterCallbackTest = jest.fn();
		await api1Messenger.remoteApi.registerCallback({ callback: resgisterCallbackTest });
		expect(callbacks).toHaveLength(1);
	});
});
