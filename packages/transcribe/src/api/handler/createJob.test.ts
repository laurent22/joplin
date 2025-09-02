import Logger from '@joplin/utils/Logger';
import initiateLogger from '../../services/initiateLogger';
import { BaseQueue, JobData } from '../../types';
import createJob from './createJob';
import { cleanUpDb, initDb } from '../../testUtils';
import FileStorage from '../../services/FileStorage';
import { copyFile, exists, remove } from 'fs-extra';
import { join } from 'path';

describe('createJob', () => {
	let queue: BaseQueue;

	beforeAll(() => {
		initiateLogger();
		Logger.globalLogger.enabled = false;
	});

	beforeEach(async () => {
		queue = await initDb('createJob.test.sqlite3');
	});

	afterEach(async () => {
		const job = await queue.fetch();
		if (job) {
			await remove(join('images', job.data.filePath));
		}
		await queue.stop();
		await cleanUpDb('./createJob.test.sqlite3');
	});

	it('should be able to store a image and retrieve a job', async () => {
		const requirements = {
			filepath: 'filepath',
			storeImage: () => Promise.resolve('file-id'),
			sendToQueue: (data: JobData) => queue.send(data),

		};
		const result = await createJob(requirements);
		const job = await queue.fetch();
		if (job === null) throw new Error('Should not be null');

		expect(result.jobId).toEqual(job.id);
		expect(job).toEqual({
			data: {
				filePath: 'file-id',
			},
			id: result.jobId,
			retryCount: 0,
		});
	});

	it('should fail if is not possible to store image', async () => {
		const requirements = {
			filepath: 'filepath',
			storeImage: () => { throw new Error('Something went wrong'); },
			sendToQueue: (data: JobData) => queue.send(data),

		};

		expect(async () => createJob(requirements)).rejects.toThrow();

		const job = await queue.fetch();
		expect(job).toBeNull();
	});

	it('should delete the original file after storing', async () => {
		await copyFile('./images/htr_sample.png', './test_file.png');

		const fs = new FileStorage();
		const requirements = {
			filepath: './test_file.png',
			storeImage: fs.store,
			sendToQueue: (data: JobData) => queue.send(data),
		};

		await createJob(requirements);

		const originalFile = await exists('./test_file.png');
		expect(originalFile).toBe(false);
	});
});
