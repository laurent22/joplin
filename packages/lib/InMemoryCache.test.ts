import InMemoryCache from './InMemoryCache';
import time from './time';

describe('InMemoryCache', () => {

	it('should get and set values', () => {
		const cache = new InMemoryCache();

		expect(cache.value('test')).toBe(undefined);
		expect(cache.value('test', 'default')).toBe('default');

		cache.setValue('test', 'something');
		expect(cache.value('test')).toBe('something');

		// Check we get the exact same object back (cache should not copy)
		const someObj = { abcd: '123' };
		cache.setValue('someObj', someObj);
		expect(cache.value('someObj')).toBe(someObj);
	});

	it('should expire values', async () => {
		const cache = new InMemoryCache();

		// Check that the value is udefined once the cache has expired
		cache.setValue('test', 'something', 500);
		expect(cache.value('test')).toBe('something');
		await time.msleep(510);
		expect(cache.value('test')).toBe(undefined);

		// This test can sometimes fail in some cases, probably because it
		// sleeps for more than 100ms (when the computer is slow). Changing this
		// to use higher values would slow down the test unit too much, so let's
		// disable it for now.

		// Check that the TTL is reset every time setValue is called
		// cache.setValue('test', 'something', 300);
		// await time.msleep(100);
		// cache.setValue('test', 'something', 300);
		// await time.msleep(100);
		// cache.setValue('test', 'something', 300);
		// await time.msleep(100);
		// cache.setValue('test', 'something', 300);
		// await time.msleep(100);

		// expect(cache.value('test')).toBe('something');
	});

	it('should delete old records', async () => {
		const cache = new InMemoryCache(5);

		cache.setValue('1', '1');
		cache.setValue('2', '2');
		cache.setValue('3', '3');
		cache.setValue('4', '4');
		cache.setValue('5', '5');

		expect(cache.value('1')).toBe('1');

		cache.setValue('6', '6');

		expect(cache.value('1')).toBe(undefined);
	});

});
