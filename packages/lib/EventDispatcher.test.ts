import EventDispatcher from './EventDispatcher';

enum TestKey {
    FooEvent,
    BarEvent,
    BazEvent,
}

describe('Adding/removing listeners', () => {
	it('Adding a single listener and removing it', () => {
		const dispatcher = new EventDispatcher<TestKey, void>();
		let calledCount = 0;
		const handle = dispatcher.on(TestKey.FooEvent, () => {
			calledCount ++;
		});

		expect(calledCount).toBe(0);
		dispatcher.dispatch(TestKey.FooEvent);
		expect(calledCount).toBe(1);

		handle.remove();

		dispatcher.dispatch(TestKey.FooEvent);
		expect(calledCount).toBe(1);
	});

	it('Adding multiple listeners, removing multiple', () => {
		const dispatcher = new EventDispatcher<TestKey, void>();

		let fooCount = 0;
		const fooListener = dispatcher.on(TestKey.FooEvent, () => {
			fooCount ++;
		});

		let barCount = 0;
		const barListener1 = dispatcher.on(TestKey.BarEvent, () => {
			barCount ++;
		});
		const barListener2 = dispatcher.on(TestKey.BarEvent, () => {
			barCount += 3;
		});
		const barListener3 = dispatcher.on(TestKey.BarEvent, () => {
			barCount += 2;
		});

		dispatcher.dispatch(TestKey.BarEvent);
		expect(barCount).toBe(6);

		dispatcher.dispatch(TestKey.FooEvent);
		expect(barCount).toBe(6);
		expect(fooCount).toBe(1);

		fooListener.remove();
		barListener2.remove();

		// barListener2 shouldn't be fired
		dispatcher.dispatch(TestKey.BarEvent);
		expect(barCount).toBe(9);

		// The BazEvent shouldn't change fooCount or barCount
		dispatcher.dispatch(TestKey.BazEvent);
		expect(barCount).toBe(9);
		expect(fooCount).toBe(1);

		// Removing a listener for the first time should return true (it removed the listener)
		// and false all subsequent times
		expect(barListener1.remove()).toBe(true);
		expect(barListener1.remove()).toBe(false);
		expect(barListener3.remove()).toBe(true);
	});

	it('Removing a listener in a listener', () => {
		const dispatcher = new EventDispatcher<TestKey, void>();

		let count = 0;
		const barListener = () => {
		};
		const bazListener = () => {
			count += 5;
		};
		const fooListener = () => {
			count ++;
			dispatcher.off(TestKey.FooEvent, barListener);
		};
		dispatcher.on(TestKey.FooEvent, barListener);
		dispatcher.on(TestKey.FooEvent, fooListener);
		dispatcher.on(TestKey.FooEvent, bazListener);

		// Removing a listener shouldn't cause other listeners to be skipped
		dispatcher.dispatch(TestKey.FooEvent);

		expect(count).toBe(6);
	});
});

describe('Activation of listeners', () => {
	it('Async activation', async () => {
		const dispatcher = new EventDispatcher<TestKey, string>();

		let lastResult = '';
		const resultListener = (result: string) => {
			lastResult = result;
		};

		dispatcher.on(TestKey.BarEvent, resultListener);

		dispatcher.dispatch(TestKey.BazEvent, 'Testing...');
		expect(lastResult).toBe('');

		dispatcher.dispatch(TestKey.BarEvent, 'Test.');
		dispatcher.off(TestKey.BarEvent, resultListener);

		dispatcher.dispatch(TestKey.BarEvent, 'Testing.');
		expect(lastResult).toBe('Test.');
	});
});

it('JavaScript API', () => {
	const Dispatcher = require('./EventDispatcher').default;
	const dispatcher = new Dispatcher();

	let pass = false;
	dispatcher.on('Evnt', () => {
		pass = true;
	});

	expect(pass).toBe(false);
	dispatcher.dispatch('Evnt');
	expect(pass).toBe(true);
});
