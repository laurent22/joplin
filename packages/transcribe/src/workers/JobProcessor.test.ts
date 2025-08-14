import Logger from '@joplin/utils/Logger';
import initiateLogger from '../services/initiateLogger';
import { cleanUpDb, initDb } from '../testUtils';
import JobProcessor from './JobProcessor';
import HtrCli from '../core/HtrCli';
import { Minute, msleep, Second } from '@joplin/utils/time';
import { BaseQueue, OutputSuccess } from '../types';

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
		const tw = new JobProcessor(queue, new HtrCli('joplin/htr-cli:0.0.2', 'images'), 1000);
		await tw.init();

		const jobId = await queue.send({ filePath: 'htr_sample.png' });

		for (let i = 0; i < 20; i++) {
			await msleep(30 * Second);
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
		const tw = new JobProcessor(queue, new HtrCli('joplin/htr-cli:0.0.2', 'images'), 1000);
		await tw.init();

		const jobId1 = await queue.send({ filePath: 'non-existing-file' });
		const jobId2 = await queue.send({ filePath: 'htr_sample.png' });

		for (let i = 0; i < 20; i++) {
			await msleep(30 * Second);
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
});
