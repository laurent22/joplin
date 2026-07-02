import RankingService from '../../src/services/RankingService';
import { PythonProcessManagerApi } from 'src/interfaces/IPythonProcessManager';
import { RankResponse } from '../../src/types/types';
import { PythonNlpError } from '../../src/errors/errors';

const makeResponse = (overrides: Partial<RankResponse> = {}): RankResponse => ({
	id: 'test-id',
	results: [{ word: 'happy', score: 0.9 }],
	...overrides,
});

const makeMockManager = (response: RankResponse): PythonProcessManagerApi => ({
	start: jest.fn(),
	stop: jest.fn(),
	send: jest.fn().mockResolvedValue(response),
});

describe('RankingService', () => {
	test('returns response from the process manager', async () => {
		const expected = makeResponse();
		const service = new RankingService(makeMockManager(expected));
		const result = await service.getSuggestions('glad', 'I am glad to be here');
		expect(result).toBe(expected);
	});

	test('forwards word and sentence as context to the process manager', async () => {
		const mockManager = makeMockManager(makeResponse());
		const service = new RankingService(mockManager);
		await service.getSuggestions('glad', 'I am glad to be here');
		const sent = (mockManager.send as jest.Mock).mock.calls[0][0];
		expect(sent.word).toBe('glad');
		expect(sent.context).toBe('I am glad to be here');
	});

	test('generates a unique id for each request', async () => {
		const mockManager = makeMockManager(makeResponse());
		const service = new RankingService(mockManager);
		await service.getSuggestions('glad', 'sentence one');
		await service.getSuggestions('happy', 'sentence two');
		const [first, second] = (mockManager.send as jest.Mock).mock.calls.map(
			([req]) => req.id,
		);
		expect(first).not.toBe(second);
	});

	test('throws PythonNlpError when the response contains an error field', async () => {
		const errorResponse = makeResponse({ error: 'NLP model not loaded' });
		const service = new RankingService(makeMockManager(errorResponse));
		await expect(service.getSuggestions('glad', 'sentence')).rejects.toThrow(
			PythonNlpError,
		);
	});
});
