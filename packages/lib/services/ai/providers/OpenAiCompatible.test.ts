import { mockFetch, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import OpenAiCompatibleProvider from './OpenAiCompatible';
import { ChatMessage, ChatRole } from '../types';

const mockChatResponse = (message: Record<string, unknown>, finishReason: string|undefined) => {
	return mockFetch(() => {
		return new Response(JSON.stringify({
			choices: [{ message, finish_reason: finishReason }],
			usage: { prompt_tokens: 10, completion_tokens: 20 },
		}), { status: 200 });
	});
};

type RequestBody = { messages: Record<string, unknown>[] };

const mockChatResponses = (responses: (()=> Response)[]) => {
	const requestBodies: Promise<RequestBody>[] = [];
	mockFetch(request => {
		requestBodies.push(request.json());
		return responses.shift()();
	});
	return { requestBodies: () => Promise.all(requestBodies) };
};

const errorResponse = (message: string) => () => new Response(JSON.stringify({ error: { message } }), { status: 400 });
const okResponse = () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });

// Starts like a note chat: Joplin adds the initial readNote tool call itself.
const toolCallMessages: ChatMessage[] = [
	{ role: ChatRole.System, content: 'System prompt' },
	{ role: ChatRole.User, content: 'Hello' },
	{ role: ChatRole.Assistant, content: '', toolCalls: [{ callId: 'call_read1', toolName: 'editor_readNoteBody', arguments: {}, parseError: null }] },
	{ role: ChatRole.Tool, content: 'Note body', toolCallId: 'call_read1', toolName: 'editor_readNoteBody', userDescription: '', isEdit: false, isError: false },
];

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

	it('retries with an empty reasoning_content when the provider requires it', async () => {
		const api = mockChatResponses([
			errorResponse('The `reasoning_content` in the thinking mode must be passed back to the API.'),
			okResponse,
		]);
		const result = await newProvider().chat(toolCallMessages);
		expect(result.text).toBe('OK');

		const [first, second] = await api.requestBodies();
		expect(first.messages.map(m => m.reasoning_content)).toEqual([undefined, undefined, undefined, undefined]);
		expect(second.messages.map(m => m.reasoning_content)).toEqual([undefined, undefined, '', undefined]);
	});

	it('does not retry on other 400 errors', async () => {
		const api = mockChatResponses([errorResponse('Invalid model'), okResponse]);
		await expect(newProvider().chat(toolCallMessages)).rejects.toThrow('AI provider returned 400: Invalid model');
		expect(await api.requestBodies()).toHaveLength(1);
	});

});
