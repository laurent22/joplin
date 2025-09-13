import Setting from '../../../models/Setting';
import { createNoteAndResource, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import { ResourceOcrStatus } from '../../database/types';
import OcrDriverTranscribe from './OcrDriverTranscribe';
import { reg } from '../../../registry';

type JobGenerated = { jobId: string };
type GetResultPending = { state: string; jobId: string };
type GetResultCompleted = { state: 'completed'; jobId: string; output: { result: string } };
type GetResultFailed = { state: 'failed'; jobId: string; output: { stack: string; message: string } };

type Response = JobGenerated | GetResultPending | GetResultCompleted | GetResultFailed | Error;

interface MockApi {
	exec: jest.MockedFunction<(
		method: string,
		path: string,
		query?: unknown,
		body?: unknown,
		headers?: Record<string, string>,
		options?: Record<string, unknown>
	)=> Promise<Response>>;
}

describe('OcrDriverTranscribe', () => {
	let mockApi: MockApi;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		mockApi = {
			exec: jest.fn(),
		};

		const mockApiMethod = jest.fn().mockResolvedValue(mockApi);
		const mockDriver = { api: mockApiMethod };
		const mockFileApi = { driver: jest.fn().mockReturnValue(mockDriver) };
		const mockSyncTarget = { fileApi: jest.fn().mockResolvedValue(mockFileApi) };

		reg.syncTarget = jest.fn().mockReturnValue(mockSyncTarget);
	});

	it('should return an error if synchronization target is not set', async () => {
		const { resource } = await createNoteAndResource();
		const htr = new OcrDriverTranscribe();
		const response = await htr.recognize('', 'mock-path', resource.id);

		expect(response.ocr_status).toBe(ResourceOcrStatus.Error);
	});

	it('should return correct response when successful', async () => {
		const { resource } = await createNoteAndResource();

		mockApi.exec.mockResolvedValue(Promise.resolve({ jobId: 'not-a-real-job-id' }));
		mockApi.exec.mockResolvedValue(Promise.resolve({ state: 'pending', jobId: 'not-a-real-job-id' }));
		mockApi.exec.mockResolvedValue(Promise.resolve({ state: 'completed', jobId: 'not-a-real-job-id', output: { result: 'this is the final transcription' } }));

		const htr = new OcrDriverTranscribe([1]);
		Setting.setValue('sync.target', 9);

		const response = await htr.recognize('', resource.filename, resource.id);

		expect(response.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(response.ocr_text).toBe('this is the final transcription');
	});

	it('should return error when unsuccessful', async () => {
		const { resource } = await createNoteAndResource();

		mockApi.exec.mockResolvedValue(Promise.resolve({ jobId: 'not-a-real-job-id' }));
		mockApi.exec.mockResolvedValue(Promise.resolve({ state: 'failed', jobId: 'not-a-real-job-id', output: { stack: '', message: 'Something went wrong' } }));

		const htr = new OcrDriverTranscribe([1]);
		Setting.setValue('sync.target', 9);

		const response = await htr.recognize('', resource.filename, resource.id);

		expect(response.ocr_status).toBe(ResourceOcrStatus.Error);
		expect(response.ocr_error).toEqual({ stack: '', message: 'Something went wrong' });
	});

	it('should be able to retrieve jobId from database instead of creating a new job', async () => {
		const { resource } = await createNoteAndResource();
		const jobId = 'jobIdThat should be reused latter';

		mockApi.exec.mockResolvedValue(Promise.resolve({ jobId }));
		mockApi.exec.mockImplementationOnce(() => { throw new Error('Network request failed'); });

		const htr = new OcrDriverTranscribe([1]);
		Setting.setValue('sync.target', 9);

		const response = await htr.recognize('', resource.filename, resource.id);
		await htr.dispose();
		expect(response.ocr_status).toBe(ResourceOcrStatus.Todo);
		expect(response.ocr_error).toBe('');

		// Simulating closing/opening application
		mockApi.exec.mockResolvedValue({ jobId, state: 'completed', output: { result: 'result' } });
		const htr2 = new OcrDriverTranscribe([1]);

		const response2 = await htr2.recognize('', resource.filename, resource.id);
		expect(response2.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(response2.ocr_text).toBe('result');

	});
});
