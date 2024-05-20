import Logger, { LogLevel, TargetType } from './Logger';
import { WriteFileOptions, appendFile, mkdirp, readFile, remove } from 'fs-extra';

Logger.fsDriver_ = {
	appendFile: async (path, content, encoding) => {
		return await appendFile(path, content, encoding as WriteFileOptions);
	},
};

const testDirPath = `${__dirname}/LoggerTests`;

const logPath = () => {
	return `${testDirPath}/log.txt`;
};

const getLogContent = async () => {
	return readFile(logPath(), 'utf-8');
};

const createLogger = () => {
	const logger = new Logger();
	logger.addTarget(TargetType.File, {
		prefix: 'testing',
		path: logPath(),
		level: LogLevel.Debug,
	});
	return logger;
};

describe('Logger', () => {

	beforeEach(async () => {
		await mkdirp(testDirPath);
	});

	afterEach(async () => {
		await remove(testDirPath);
	});

	it('should log to file', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2020-01-01 00:00:00'));

		const logger = createLogger();
		logger.debug('one');
		logger.warn('two');
		logger.error('three');

		await logger.waitForFileWritesToComplete_();

		expect(await getLogContent()).toBe([
			'2020-01-01 00:00:00: testing: one',
			'2020-01-01 00:00:00: testing: [warn] two',
			'2020-01-01 00:00:00: testing: [error] three',
			'',
		].join('\n'));

		jest.useRealTimers();
	});

	test.each([
		[['one', 'two'], 'one two'],
		[[true, false, undefined, null], '<true> <false> <undefined> <null>'],
		[['123', 123], '123 123'],
		[[['a', 'b', ['sub1', 'sub2']]], '[a, b, [sub1, sub2]]'],
		[[''], ''],
		[[{ that: 'is json', sub: { key1: 'abc', key2: 'def' } }], '{"that":"is json","sub":{"key1":"abc","key2":"def"}}'],
	])('should format messages correctly', async (input, expected) => {
		jest.useFakeTimers().setSystemTime(new Date('2020-01-01 00:00:00'));
		const logger = createLogger();
		logger.info(...input);
		await logger.waitForFileWritesToComplete_();
		expect(await getLogContent()).toBe(`2020-01-01 00:00:00: testing: ${expected}\n`);
		jest.useRealTimers();
	});

	// it('should keep the last lines', async () => {
	// 	jest.useFakeTimers().setSystemTime(new Date('2020-01-01 00:00:00'));

	// 	const logger = createLogger();
	// 	logger.keptLineCount = 2;
	// 	logger.info('one');
	// 	logger.info('two');
	// 	logger.info('three');

	// 	await logger.waitForFileWritesToComplete_();

	// 	expect(await getLogContent()).toBe([
	// 		'2020-01-01 00:00:00: testing: one',
	// 		'2020-01-01 00:00:00: testing: two',
	// 		'2020-01-01 00:00:00: testing: three',
	// 		'',
	// 	].join('\n'));

	// 	expect(logger.keptLines).toEqual([
	// 		'2020-01-01 00:00:00: testing: two',
	// 		'2020-01-01 00:00:00: testing: three',
	// 	]);

	// 	jest.useRealTimers();
	// });

});
