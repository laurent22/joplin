import PerformanceLogger from './PerformanceLogger';

describe('PerformanceLogger', () => {
	beforeEach(() => {
		PerformanceLogger.reset_();
	});

	test('should buffer log messages created before a logger is attached', () => {
		const logger = PerformanceLogger.create();
		logger.mark('test/Test');

		const log: string[] = [];
		PerformanceLogger.setLogger({
			info: (message) => log.push(`info: ${message}`),
			debug: (message) => log.push(`debug: ${message}`),
		});

		expect(log).toHaveLength(1);
		expect(log[0]).toMatch(/^info: Performance: test\/Test: Mark at/);

		// Should continue using the set logger
		const task = logger.taskStart('test/Test task');
		expect(log).toHaveLength(2);
		task.onEnd();
		expect(log).toHaveLength(3);
	});
});
