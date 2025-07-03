import Setting from '../../../models/Setting';
import { createNoteAndResource, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import { ResourceOcrStatus } from '../../database/types';
import HtrDriver from './HtrDriver';
import { ServerApiInterface } from '../../../types';

type JobGenerated = { jobId: string };
type GetResultPending = { state: string; jobId: string };
type GetResultCompleted = { state: 'completed'; jobId: string; output: { result: string } };
type GetResultFailed = { state: 'failed'; jobId: string; output: { stack: string; message: string } };

type Responses = JobGenerated | GetResultPending | GetResultCompleted | GetResultFailed | Error;

const getMockedApi = (responses: Responses[]) => {
	return class implements ServerApiInterface {
		private i = 0;
		public exec() {
			const response = responses[this.i];
			this.i++;
			if (response instanceof Error) {
				return Promise.reject(response);
			}
			return Promise.resolve(response);
		}
	};

};


describe('HtrDriver', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should return an error if synchronization target is not set', async () => {
		const { resource } = await createNoteAndResource();
		const htr = new HtrDriver(getMockedApi([]));
		const response = await htr.recognize('', 'mock-path', resource.id);

		expect(response.ocr_status).toBe(ResourceOcrStatus.Error);
	});

	it('should return correct response when successful', async () => {
		const { resource } = await createNoteAndResource();
		const mockedApi = getMockedApi([
			{ jobId: 'not-a-real-job-id' },
			{ state: 'pending', jobId: 'not-a-real-job-id' },
			{ state: 'completed', jobId: 'not-a-real-job-id', output: { result: 'this is the final transcription' } },
		]);
		const htr = new HtrDriver(mockedApi, [1]);
		Setting.setValue('sync.target', 9);

		const response = await htr.recognize('', resource.filename, resource.id);

		expect(response.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(response.ocr_text).toBe('this is the final transcription');
	});

	it('should return error when unsuccessful', async () => {
		const { resource } = await createNoteAndResource();
		const mockedApi = getMockedApi([
			{ jobId: 'not-a-real-job-id' },
			{ state: 'failed', jobId: 'not-a-real-job-id', output: { stack: '', message: 'Something went wrong' } },
		]);
		const htr = new HtrDriver(mockedApi, [1]);
		Setting.setValue('sync.target', 9);

		const response = await htr.recognize('', resource.filename, resource.id);

		expect(response.ocr_status).toBe(ResourceOcrStatus.Error);
		expect(response.ocr_error).toEqual({ stack: '', message: 'Something went wrong' });
	});

	it('should be able to retrieve jobId from database instead of creating a new job', async () => {
		const { resource } = await createNoteAndResource();
		const jobId = 'jobIdThat should be reused latter';

		const mockedApi = getMockedApi([
			{ jobId },
			new Error('Network request failed'),
		]);
		const htr = new HtrDriver(mockedApi, [1]);
		Setting.setValue('sync.target', 9);

		const response = await htr.recognize('', resource.filename, resource.id);
		await htr.dispose();
		expect(response.ocr_status).toBe(ResourceOcrStatus.Todo);
		expect(response.ocr_error).toBe('');

		// Simulating closing/opening application
		const mockedApi2 = getMockedApi([
			{ jobId, state: 'completed', output: { result: 'result' } },
		]);
		const htr2 = new HtrDriver(mockedApi2, [1]);

		const response2 = await htr2.recognize('', resource.filename, resource.id);
		expect(response2.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(response2.ocr_text).toBe('result');

	});
});
