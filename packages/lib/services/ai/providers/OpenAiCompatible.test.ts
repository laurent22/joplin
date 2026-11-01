import { mockFetch, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import OpenAiCompatibleProvider from './OpenAiCompatible';
import { ChatRole } from '../types';

const mockChatResponse = (message: Record<string, unknown>, finishReason: string|undefined) => {
	return mockFetch(() => {
		return new Response(JSON.stringify({
			choices: [{ message, finish_reason: finishReason }],
			usage: { prompt_tokens: 10, completion_tokens: 20 },
		}), { status: 200 });
	});
};

const newProvider = () => {
	return new OpenAiCompatibleProvider({
		baseUrl: 'http://localhost:1234/v1',
		apiKey: 'test-key',
		model: 'test-model',
		classification: 'local',
	});
};

const chat = async () => {
	return newProvider().chat([{ role: ChatRole.User, content: 'Hello' }]);
};

describe('ai/providers/OpenAiCompatible', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	test.each([
		['length', 'length'],
		['max_tokens', 'length'],
		['MAX_TOKENS', 'length'],
		['stop', 'stop'],
		['tool_calls', 'tool_calls'],
		['content_filter', 'other'],
		[undefined, undefined],
	])('maps finish_reason %s to %s', async (finishReason, expected) => {
		mockChatResponse({ content: 'OK' }, finishReason);
		const result = await chat();
		expect(result.finishReason).toBe(expected);
	});

	test.each([
		['reasoning_content'],
		['reasoning'],
	])('surfaces the reasoning trace from %s', async (field) => {
		mockChatResponse({ content: '', [field]: 'Let me think...' }, 'length');
		const result = await chat();
		expect(result.text).toBe('');
		expect(result.reasoningText).toBe('Let me think...');
	});

	it('leaves reasoningText undefined when the provider reports none', async () => {
		mockChatResponse({ content: 'OK' }, 'stop');
		const result = await chat();
		expect(result.reasoningText).toBeUndefined();
	});

});
