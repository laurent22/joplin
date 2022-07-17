import Notifier from './Notifier';

enum TestKey {
    FooEvent,
    BarEvent,
    BazEvent,
}

describe('Adding/removing listeners', () => {
	it('Adding a single listener and removing it', () => {
		const notifier = new Notifier<TestKey, void>();
		let calledCount = 0;
		const handle = notifier.addListener(TestKey.FooEvent, () => {
			calledCount ++;
		});

		expect(calledCount).toBe(0);
		notifier.notifyAll(TestKey.FooEvent);
		expect(calledCount).toBe(1);

		handle.remove();

		notifier.notifyAll(TestKey.FooEvent);
		expect(calledCount).toBe(1);
	});

	it('Adding multiple listeners, removing multiple', () => {
		const notifier = new Notifier<TestKey, void>();

		let fooCount = 0;
		const fooListener = notifier.addListener(TestKey.FooEvent, () => {
			fooCount ++;
		});

		let barCount = 0;
		const barListener1 = notifier.addListener(TestKey.BarEvent, () => {
			barCount ++;
		});
		const barListener2 = notifier.addListener(TestKey.BarEvent, () => {
			barCount += 3;
		});
		const barListener3 = notifier.addListener(TestKey.BarEvent, () => {
			barCount += 2;
		});

		notifier.notifyAll(TestKey.BarEvent);
		expect(barCount).toBe(6);

		notifier.notifyAll(TestKey.FooEvent);
		expect(barCount).toBe(6);
		expect(fooCount).toBe(1);

		fooListener.remove();
		barListener2.remove();

		// barListener2 shouldn't be fired
		notifier.notifyAll(TestKey.BarEvent);
		expect(barCount).toBe(9);

		// The BazEvent shouldn't change fooCount or barCount
		notifier.notifyAll(TestKey.BazEvent);
		expect(barCount).toBe(9);
		expect(fooCount).toBe(1);

		// Removing a listener for the first time should return true (it removed the listener)
		// and false all subsequent times
		expect(barListener1.remove()).toBe(true);
		expect(barListener1.remove()).toBe(false);
		expect(barListener3.remove()).toBe(true);
	});
});

describe('Activation of listeners', () => {
	it('Async activation', async () => {
		const notifier = new Notifier<TestKey, string>();

		let lastResult = '';
		const setResult = notifier.waitFor(TestKey.BarEvent).then(result => {
			lastResult = result;
		});

		notifier.notifyAll(TestKey.BazEvent, 'Testing...');
		expect(lastResult).toBe('');

		notifier.notifyAll(TestKey.BarEvent, 'Test.');
		notifier.notifyAll(TestKey.BarEvent, 'Testing.');
		await setResult;
		expect(lastResult).toBe('Test.');
	});
});
