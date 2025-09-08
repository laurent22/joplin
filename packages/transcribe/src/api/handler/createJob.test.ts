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
		await copyFile('./images/htr_sample.png', './test_file-1.png');

		const fileStorage = new FileStorage();

		const requirements = {
			filepath: './test_file-1.png',
			storeImage: (filePath: string) => fileStorage.store(filePath),
			sendToQueue: (data: JobData) => queue.send(data),
			imageMaxDimension: 400,
			randomName: 'test_file_resized-1',
		};
		const result = await createJob(requirements);
		const job = await queue.fetch();
		if (job === null) throw new Error('Should not be null');

		expect(result.jobId).toEqual(job.id);

		await remove(join('images', job.data.filePath));
	});

	it('should fail if is not possible to store image', async () => {
		await copyFile('./images/htr_sample.png', './test_file-2.png');

		const requirements = {
			filepath: './test_file-2.png',
			storeImage: () => { throw new Error('Something went wrong'); },
			sendToQueue: (data: JobData) => queue.send(data),
			imageMaxDimension: 400,
			randomName: 'test_file_resized-2',
		};

		expect(async () => createJob(requirements)).rejects.toThrow();

		const job = await queue.fetch();
		expect(job).toBeNull();

		await remove(join(process.cwd(), 'images', requirements.randomName));
	});

	it('should delete the original file after storing', async () => {
		await copyFile('./images/htr_sample.png', './test_file-3.png');

		const fs = new FileStorage();
		const requirements = {
			filepath: './test_file-3.png',
			storeImage: fs.store,
			sendToQueue: (data: JobData) => queue.send(data),
			imageMaxDimension: 400,
			randomName: 'test_file_resized-3',
		};

		await createJob(requirements);

		const originalFile = await exists('./test_file-3.png');
		expect(originalFile).toBe(false);
	});
});
