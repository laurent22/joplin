import AsyncActionQueue from './AsyncActionQueue';
import { runWithFakeTimers, withWarningSilenced } from './testing/test-utils';

describe('AsyncActionQueue', () => {
	beforeEach(() => {
		jest.useRealTimers();
	});

	test('should run a single task', async () => {
		const queue = new AsyncActionQueue(0);

		await expect(new Promise(resolve => {
			queue.push(() => resolve('success'));
		})).resolves.toBe('success');

		await expect(new Promise(resolve => {
			queue.push(() => resolve('task 2'));
		})).resolves.toBe('task 2');
	});

	test('should merge all tasks by default', async () => {
		const queue = new AsyncActionQueue(100);
		jest.useFakeTimers();

		const result = {
			ranFirst: false,
			ranSecond: false,
			ranThird: false,
			ranFourth: false,
		};
		queue.push(() => {
			result.ranFirst = true;
		});
		queue.push(() => {
			result.ranSecond = true;
		});
		queue.push(() => {
			result.ranThird = true;
		});
		queue.push(() => {
			result.ranFourth = true;
		});

		const processPromise = queue.processAllNow();
		await jest.runAllTimersAsync();
		await processPromise;

		expect(result).toMatchObject({
			ranFirst: false,
			ranSecond: false,
			ranThird: false,
			ranFourth: true,
		});
	});

	test('should reject processAllNow when a task fails', async () => {
		const queue = new AsyncActionQueue(100);
		jest.useFakeTimers();
		const error = new Error('Task failed');

		queue.push(async () => {
			throw error;
		});

		await withWarningSilenced(/Unhandled error: Error: Task failed/, async () => {
			const processPromise = queue.processAllNow();
			const rejectionExpectation = expect(processPromise).rejects.toBe(error);
			await jest.runAllTimersAsync();
			await rejectionExpectation;
			expect(queue.isEmpty).toBe(true);
		});
	});

	test('should handle failures when queue processing is not awaited', async () => {
		await runWithFakeTimers(async () => {
			const queue = new AsyncActionQueue(100);
			const failingAction = jest.fn(async () => {
				throw new Error('Task failed');
			});
			queue.push(failingAction);

			await jest.runAllTimersAsync();
			expect(failingAction).toHaveBeenCalledTimes(1);
		});
	});

	test.each([
		{
			tasks: [
				'a', 'b',
			],
			expectedToRun: [
				'a', 'b',
			],
		},
		{
			tasks: [
				'a', 'b', 'c',
			],
			expectedToRun: [
				'a', 'b', 'c',
			],
		},
		{
			tasks: [
				'group1', 'group1', 'group1', 'group2', 'group1', 'group1', 'group2', 'group2',
			],
			expectedToRun: [
				'group1', 'group2', 'group1', 'group2',
			],
		},
	])('should support customising how tasks are merged', async ({ tasks, expectedToRun }) => {
		const queue = new AsyncActionQueue<string>(100);

		// Determine which tasks can be merged based on their context
		queue.setCanSkipTaskHandler((current, next) => {
			return current.context === next.context;
		});
		jest.useFakeTimers();

		const result: string[] = [];
		for (const task of tasks) {
			queue.push(() => {
				result.push(task);
			}, task);
		}

		const processPromise = queue.processAllNow();
		await jest.runAllTimersAsync();
		await processPromise;

		expect(result).toMatchObject(expectedToRun);
	});
});
