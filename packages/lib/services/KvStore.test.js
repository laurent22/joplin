const { setupDatabaseAndSynchronizer, db, switchClient } = require('../testing/test-utils.js');
const KvStore = require('../services/KvStore').default;

function setupStore() {
	const store = KvStore.instance();
	store.setDb(db());
	return store;
}

describe('services_KvStore', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set and get values', (async () => {
		const store = setupStore();
		await store.setValue('a', 123);
		expect(await store.value('a')).toBe(123);

		await store.setValue('a', 123);
		expect(await store.countKeys()).toBe(1);
		expect(await store.value('a')).toBe(123);

		await store.setValue('a', 456);
		expect(await store.countKeys()).toBe(1);
		expect(await store.value('a')).toBe(456);

		await store.setValue('b', 789);
		expect(await store.countKeys()).toBe(2);
		expect(await store.value('a')).toBe(456);
		expect(await store.value('b')).toBe(789);
	}));

	it('should set and get values with the right type', (async () => {
		const store = setupStore();
		await store.setValue('string', 'something');
		await store.setValue('int', 123);
		expect(await store.value('string')).toBe('something');
		expect(await store.value('int')).toBe(123);
	}));

	it('should increment values', (async () => {
		const store = setupStore();
		await store.setValue('int', 1);
		const newValue = await store.incValue('int');

		expect(newValue).toBe(2);
		expect(await store.value('int')).toBe(2);

		expect(await store.incValue('int2')).toBe(1);
		expect(await store.countKeys()).toBe(2);
	}));

	it('should handle non-existent values', (async () => {
		const store = setupStore();
		expect(await store.value('nope')).toBe(null);
	}));

	it('should delete values', (async () => {
		const store = setupStore();
		await store.setValue('int', 1);
		expect(await store.countKeys()).toBe(1);
		await store.deleteValue('int');
		expect(await store.countKeys()).toBe(0);

		await store.deleteValue('int'); // That should not throw
	}));

	it('should increment in an atomic way', (async () => {
		const store = setupStore();
		await store.setValue('int', 0);

		const promises = [];
		for (let i = 0; i < 20; i++) {
			promises.push(store.incValue('int'));
		}

		await Promise.all(promises);

		expect(await store.value('int')).toBe(20);
	}));

	it('should search by prefix', (async () => {
		const store = setupStore();
		await store.setValue('testing:1', 1);
		await store.setValue('testing:2', 2);

		const results = await store.searchByPrefix('testing:');
		expect(results.length).toBe(2);

		const numbers = results.map(r => r.value).sort();
		expect(numbers[0]).toBe(1);
		expect(numbers[1]).toBe(2);
	}));

});
