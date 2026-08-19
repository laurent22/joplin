import Logger from '@joplin/utils/Logger';
import initiateLogger from '../initiateLogger';
import SqliteQueue from './SqliteQueue';
import { remove } from 'fs-extra';

describe('SqliteQueue', () => {
	const dbFilename = 'SqliteQueue.test.sqlite3';

	beforeAll(() => {
		initiateLogger();
		Logger.globalLogger.enabled = false;
	});

	afterEach(async () => {
		await remove(dbFilename);
	});

	it('should do nothing if trying to fail a job that does not exist', async () => {
		const queue = new SqliteQueue('sqliteQueue', {
			ttl: 900_000,
			retryCount: 2,
			maintenanceInterval: 60_000,
			database: {
				name: dbFilename,
			},
		});
		await queue.init(true);

		const jobId = await queue.send({ filePath: 'not-real-path' });

		await queue.fail('should not fail because id does not exist', new Error(''));

		const job = await queue.getJobById(jobId);
		expect(job).not.toBe(undefined);
		expect(job.state).toBe('created');

		await queue.stop();
	});

	it('should set job to retry after failing less times than retryMaxCount', async () => {
		const queue = new SqliteQueue('sqliteQueue', {
			ttl: 900_000,
			retryCount: 2,
			maintenanceInterval: 60000,
			database: {
				name: dbFilename,
			},
		});
		await queue.init(true);

		const jobId = await queue.send({ filePath: 'not-real-path' });

		const jobFetched = await queue.fetch();
		if (jobFetched === null) throw new Error('Should not be null');
		expect(jobId).toBe(jobFetched.id);
		await queue.fail(jobId, new Error(''));

		const jobFetched2 = await queue.fetch();
		if (jobFetched2 === null) throw new Error('Should not be null');
		expect(jobId).toBe(jobFetched2.id);
		await queue.fail(jobId, new Error(''));

		const job = await queue.getJobById(jobId);
		expect(job.state).toBe('retry');

		await queue.stop();
	});

	it('should set job to failed after failing more times than retryMaxCount', async () => {
		const queue = new SqliteQueue('sqliteQueue', {
			ttl: 900_000,
			retryCount: 2,
			maintenanceInterval: 60000,
			database: {
				name: dbFilename,
			},
		});
		await queue.init(true);

		const jobId = await queue.send({ filePath: 'not-real-path' });

		const jobFetched = await queue.fetch();
		if (jobFetched === null) throw new Error('Should not be null');
		expect(jobId).toBe(jobFetched.id);

		await queue.fail(jobId, new Error(''));
		const jobFetched2 = await queue.fetch();
		if (jobFetched2 === null) throw new Error('Should not be null');
		expect(jobId).toBe(jobFetched2.id);
		await queue.fail(jobId, new Error(''));
		const jobFetched3 = await queue.fetch();
		if (jobFetched3 === null) throw new Error('Should not be null');
		expect(jobId).toBe(jobFetched3.id);
		await queue.fail(jobId, new Error(''));

		const job = await queue.getJobById(jobId);
		expect(job.state).toBe('failed');

		await queue.stop();
	});

	it('should fail job that takes longer than expire time', async () => {
		jest.useFakeTimers();
		const queue = new SqliteQueue('sqliteQueue', {
			ttl: 900_000,
			retryCount: 2,
			maintenanceInterval: 60000,
			database: {
				name: dbFilename,
			},
		});
		await queue.init(true);

		const jobId = await queue.send({ filePath: 'not-real-path' });

		const job = await queue.fetch();
		if (job === null) throw new Error('Should not be null');
		expect(job.id).toBe(jobId);

		// Waiting expires time + schedule interval
		jest.advanceTimersByTime(1 + 900 * 1000 + 60 * 1000);
		await queue.maintenance();

		const jobResult = await queue.getJobById(jobId);
		expect(jobResult.state).toBe('retry');

		await queue.stop();
	});

	it('should fetch jobs that are retries too', async () => {
		jest.useFakeTimers();
		const queue = new SqliteQueue('sqliteQueue', {
			ttl: 900_000,
			retryCount: 2,
			maintenanceInterval: 60000,
			database: {
				name: dbFilename,
			},
		});
		await queue.init(true);

		const jobId = await queue.send({ filePath: 'not-real-path' });

		const job = await queue.fetch();
		if (job === null) throw new Error('Should not be null');
		expect(job.id).toBe(jobId);

		// Waiting expires time + schedule interval
		jest.advanceTimersByTime(1 + 900 * 1000 + 60 * 1000);
		await queue.maintenance();

		const jobResult = await queue.getJobById(jobId);
		expect(jobResult.state).toBe('retry');

		const job2 = await queue.fetch();
		if (job2 === null) throw new Error('Should not be null');
		expect(job.id).toBe(job2.id);

		await queue.stop();
	});
});
