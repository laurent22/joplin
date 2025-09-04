import { readFile } from 'fs-extra';
import { ApiError } from '../../utils/errors';
import { getApi, postApi } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, testAssetDir, checkThrowAsync, expectThrow, makeTempFileWithContent } from '../../utils/testing/testUtils';

export type TranscribeJob = {
	jobId: number;
};

type OutputError = { stack: string; message: string };
type OutputSuccess = { result: string };
type Output = OutputError | OutputSuccess;

type JobWithResult = {
	id: string;
	completedOn?: Date;
	result?: Output;
	state: string;
};

type TranscribeJobResponse = {
	jobId: string;
};

type TranscribeResponse = TranscribeJobResponse | JobWithResult | string;

type FetchResponse = {
	json?: ()=> Promise<TranscribeResponse>;
	text?: ()=> Promise<string>;
	status: number;
};

const fetchSpyOn = (response: FetchResponse) => {
	jest.spyOn(global, 'fetch').mockImplementation(
		jest.fn(() => Promise.resolve(response)) as jest.Mock,
	);
};

describe('api_transcribe', () => {

	beforeAll(async () => {
		await beforeAllDb('api_transcribe', {
			envValues: {
				TRANSCRIBE_ENABLED: 'true',
				TRANSCRIBE_API_KEY: 'something',
				TRANSCRIBE_SERVER_ADDRESS: 'something',
			},
		});
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create job', async () => {
		const { session } = await createUserAndSession(1);
		fetchSpyOn({
			json: () => Promise.resolve(
				{ jobId: '608626f1-cad9-4b07-a02e-ec427c47147f' },
			),
			status: 200,
		});
		const fileContent = await readFile(`${testAssetDir}/htr_example.png`);
		const tempFilePath = await makeTempFileWithContent(fileContent);
		const response = await postApi<TranscribeJob>(session.id, 'transcribe', {},
			{
				filePath: tempFilePath,
			},
		);

		expect(response.jobId).toBe('608626f1-cad9-4b07-a02e-ec427c47147f');
	});

	test('should create job and return response eventually', async () => {
		const { session } = await createUserAndSession(1);

		fetchSpyOn({
			json: () => Promise.resolve(
				{ jobId: '608626f1-cad9-4b07-a02e-ec427c47147f' },
			),
			status: 200,
		});

		const fileContent = await readFile(`${testAssetDir}/htr_example.png`);
		const tempFilePath = await makeTempFileWithContent(fileContent);
		const postResponse = await postApi<TranscribeJob>(session.id, 'transcribe', {},
			{
				filePath: tempFilePath,
			},
		);

		expect(postResponse.jobId).not.toBe(undefined);

		fetchSpyOn({
			json: () => Promise.resolve(
				{
					id: '608626f1-cad9-4b07-a02e-ec427c47147f',
					state: 'completed',
					result: { result: 'transcription' },
				},
			),
			status: 200,
		});

		const getResponse = await getApi<JobWithResult>(session.id, `transcribe/${postResponse.jobId}`, {});
		expect(getResponse.id).toBe(postResponse.jobId);
		expect(getResponse.state).toBe('completed');
		expect((getResponse.result as OutputSuccess).result).toBe('transcription');
	});

	test('should throw a error if API returns error 400', async () => {
		const { session } = await createUserAndSession(1);

		fetchSpyOn({
			json: () => Promise.resolve(''),
			status: 400,
		});

		const fileContent = await readFile(`${testAssetDir}/htr_example.png`);
		const tempFilePath = await makeTempFileWithContent(fileContent);
		const error = await checkThrowAsync(() =>
			postApi<TranscribeJob>(session.id, 'transcribe', {},
				{
					filePath: tempFilePath,
				},
			));

		expect(error instanceof ApiError).toBe(true);
	});

	test('should throw error if API returns error 500', async () => {
		const { session } = await createUserAndSession(1);

		fetchSpyOn({
			json: () => Promise.resolve(''),
			status: 500,
		});

		const fileContent = await readFile(`${testAssetDir}/htr_example.png`);
		const tempFilePath = await makeTempFileWithContent(fileContent);
		const error = await checkThrowAsync(() =>
			postApi<TranscribeJob>(session.id, 'transcribe', {},
				{
					filePath: tempFilePath,
				},
			));

		expect(error instanceof ApiError).toBe(true);
	});
	test('should throw 500 error is something unexpected', async () => {
		const { session } = await createUserAndSession(1);

		fetchSpyOn({
			json: () => Promise.reject(new Error('Something went wrong')),
			status: 200,
		});

		const fileContent = await readFile(`${testAssetDir}/htr_example.png`);
		const tempFilePath = await makeTempFileWithContent(fileContent);
		const error = await expectThrow(() =>
			postApi<TranscribeJob>(session.id, 'transcribe', {},
				{
					filePath: tempFilePath,
				},
			));

		expect(error.httpCode).toBe(500);
		expect(error.message.startsWith('POST /api/transcribe {"status":500,"body":{"error":"Something went wrong"')).toBe(true);
	});

	test.each([
		['non-json', 'Something went wrong'],
		['json', JSON.stringify({ error: 'Something went wrong' })],
	])('should be able to handle %s error responses', async (_type: string, result: string) => {
		const { session } = await createUserAndSession(1);

		fetchSpyOn({
			text: () => Promise.resolve(result),
			status: 500,
		});

		const fileContent = await readFile(`${testAssetDir}/htr_example.png`);
		const tempFilePath = await makeTempFileWithContent(fileContent);
		const error = await expectThrow(() =>
			postApi<TranscribeJob>(session.id, 'transcribe', {},
				{
					filePath: tempFilePath,
				},
			));

		const body = JSON.parse(error.message.split('POST /api/transcribe ')[1]);
		expect(error.httpCode).toBe(502);
		expect(body.body.error).toBe('Something went wrong');
	});
});
