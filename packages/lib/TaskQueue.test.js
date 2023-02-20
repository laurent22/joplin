const { setupDatabaseAndSynchronizer, sleep, switchClient } = require('./testing/test-utils.js');
const TaskQueue = require('./TaskQueue').default;

describe('TaskQueue', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should queue and execute tasks', (async () => {
		const queue = new TaskQueue();

		queue.push(1, async () => { await sleep(0.5); return 'a'; });
		queue.push(2, async () => { await sleep(0.5); return 'b'; });
		queue.push(3, async () => { await sleep(0.5); return 'c'; });

		const results = [];

		results.push(await queue.waitForResult(1));
		results.push(await queue.waitForResult(2));
		results.push(await queue.waitForResult(3));

		expect(results[0].id).toBe(1);
		expect(results[0].result).toBe('a');
		expect(results[1].id).toBe(2);
		expect(results[1].result).toBe('b');
		expect(results[2].id).toBe(3);
		expect(results[2].result).toBe('c');
	}));

	it('should handle errors', (async () => {
		const queue = new TaskQueue();

		queue.push(1, async () => { await sleep(0.5); return 'a'; });
		queue.push(2, async () => { await sleep(0.5); throw new Error('e'); });

		const results = [];

		results.push(await queue.waitForResult(1));
		results.push(await queue.waitForResult(2));

		expect(results[0].id).toBe(1);
		expect(results[0].result).toBe('a');
		expect(results[1].id).toBe(2);
		expect(!results[1].result).toBe(true);
		expect(results[1].error.message).toBe('e');
	}));

});
