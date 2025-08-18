import Logger from '@joplin/utils/Logger';
import initiateLogger from '../services/initiateLogger';
import { cleanUpDb, initDb } from '../testUtils';
import JobProcessor from './JobProcessor';
import HtrCli from '../core/HtrCli';
import { Minute, msleep, Second } from '@joplin/utils/time';
import { BaseQueue, OutputSuccess } from '../types';
import FileStorage from '../services/FileStorage';
import { join } from 'path';
import { copy, exists } from 'fs-extra';

// since the model is not deterministic, it can, sometimes, output slightly difference responses
const cleanUpResult = (result: string) => {
	if (!result) return '';
	return result.replace('“', '"').replace('”', '"');
};

const skipByDefault = (process.env.IS_CONTINUOUS_INTEGRATION || process.env.TRANSCRIBE_RUN_ALL !== '1') ? it.skip : it;

describe('JobProcessor', () => {
	let queue: BaseQueue;

	beforeAll(() => {
		initiateLogger();
		Logger.globalLogger.enabled = false;
	});

	beforeEach(async () => {
		queue = await initDb('JobProcessor.test.sqlite3');
	});

	afterEach(async () => {
		await queue.stop();
		await cleanUpDb('./JobProcessor.test.sqlite3');
	});

	skipByDefault('should execute work on job in the queue', async () => {
		jest.useRealTimers();
		const tw = new JobProcessor(queue, new HtrCli('joplin/htr-cli:latest', join(process.cwd(), 'images')), new FileStorage(), 1000);
		await tw.init();

		await copy(join('images', 'htr_sample.png'), join('images', 'htr_sample_copy.png'));
		const jobId = await queue.send({ filePath: 'htr_sample_copy.png' });

		for (let i = 0; i < 36; i++) {
			await msleep(10 * Second);
			const response = await queue.getJobById(jobId);

			if (response.state === 'active') continue;

			expect(response.id).toEqual(jobId);
			expect(response.state).toEqual('completed');
			// cSpell:disable
			expect(cleanUpResult((response.output as OutputSuccess).result)).toEqual('Elles ont dit lentement "un mot".');
			// cSpell:enable
			return;
		}
	}, 6 * Minute);

	skipByDefault('should execute work on job in the queue even if one fails', async () => {
		jest.useRealTimers();
		const tw = new JobProcessor(queue, new HtrCli('joplin/htr-cli:latest', join(process.cwd(), 'images')), new FileStorage(), 1000);
		await tw.init();
		await copy(join('images', 'htr_sample.png'), join('images', 'htr_sample_copy_2.png'));

		const jobId1 = await queue.send({ filePath: 'non-existing-file' });
		const jobId2 = await queue.send({ filePath: 'htr_sample_copy_2.png' });

		for (let i = 0; i < 36; i++) {
			await msleep(10 * Second);
			const response1 = await queue.getJobById(jobId1);
			if (response1.state === 'active') continue;
			expect(response1.state).toEqual('failed');

			const response2 = await queue.getJobById(jobId2);
			if (response2.state === 'active') continue;
			expect(response2.state).toEqual('completed');
			// cSpell:disable
			expect(cleanUpResult((response2.output as OutputSuccess).result)).toEqual('Elles ont dit lentement "un mot".');
			// cSpell:enable
			return;
		}
	}, 6 * Minute);

	skipByDefault('should remove file sent to queue if job is completed', async () => {
		jest.useRealTimers();
		const tw = new JobProcessor(queue, new HtrCli('joplin/htr-cli:latest', join(process.cwd(), 'images')), new FileStorage(), 1000);
		await tw.init();
		const imagePath = join('images', 'htr_sample_copy_3.png');
		await copy(join('images', 'htr_sample.png'), imagePath);

		const jobId = await queue.send({ filePath: 'htr_sample_copy_3.png' });

		for (let i = 0; i < 36; i++) {
			await msleep(10 * Second);
			const response = await queue.getJobById(jobId);

			if (response.state === 'active') continue;

			expect(response.id).toEqual(jobId);
			expect(response.state).toEqual('completed');

			const isFilePresent = await exists(imagePath);
			expect(isFilePresent).toBe(false);
			return;
		}

	}, 6 * Minute);

	skipByDefault('should remove file sent to queue if job fails too many times', async () => {
		jest.useRealTimers();
		const fileStorage = new FileStorage();
		const mockedFileStorageRemove = jest.fn();
		fileStorage.remove = mockedFileStorageRemove;
		const tw = new JobProcessor(queue, new HtrCli('joplin/htr-cli:latest', join(process.cwd(), 'images')), fileStorage, 1000);
		await tw.init();

		// file doesn't exist to force a fail, but the call to remove the file should still exist
		const jobId = await queue.send({ filePath: 'non_existing_file.png' });

		for (let i = 0; i < 36; i++) {
			await msleep(10 * Second);
			const response = await queue.getJobById(jobId);

			if (response.state === 'active') continue;

			expect(response.id).toEqual(jobId);
			expect(response.state).toEqual('failed');

			expect(mockedFileStorageRemove).toHaveBeenCalledWith('non_existing_file.png');
			return;
		}

	}, 6 * Minute);

});
