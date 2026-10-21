import { setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import OpenAiCompatibleProvider from './OpenAiCompatible';
import { ChatMessage, ChatResult, ChatRole } from '../types';
import { ToolImageResponse } from '../tools/types';
import mockOpenAiServer, { jsonResponse } from '../testing/mockOpenAiServer';

const baseUrl = 'http://localhost:1234/v1';

const mockChatResponse = (message: Record<string, unknown>, finishReason: string|undefined) => {
	return mockOpenAiServer(baseUrl, {
		'/chat/completions': () => jsonResponse({
			choices: [{ message, finish_reason: finishReason }],
			usage: { prompt_tokens: 10, completion_tokens: 20 },
		}),
	});
};

const responsesBody = (output: unknown[], extra: Record<string, unknown> = {}) => {
	return {
		status: 'completed',
		output,
		usage: { input_tokens: 10, output_tokens: 20 },
		...extra,
	};
};

const mockResponsesOutput = (output: unknown[], extra: Record<string, unknown> = {}) => {
	return mockOpenAiServer(baseUrl, {
		'/responses': () => jsonResponse(responsesBody(output, extra)),
	});
};

const messageItem = (text: string) => ({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] });
const reasoningItem = { type: 'reasoning', id: 'rs_1', summary: [{ type: 'summary_text', text: 'Thinking...' }], encrypted_content: 'encrypted' };
const reasoningContentItem = { type: 'reasoning', id: 'rs_1', summary: [] as unknown[], content: [{ type: 'reasoning_text', text: 'Thinking...' }] };
const functionCallItem = { type: 'function_call', id: 'fc_1', call_id: 'call_1', name: 'get_weather', arguments: '{"city":"Paris"}' };

const weatherTool = {
	id: 'get_weather',
	description: 'Gets the weather',
	inputSchema: { type: 'object', properties: { city: { type: 'string' } } },
};

const newProvider = (model = 'test-model', apiKey = 'test-key') => {
	return new OpenAiCompatibleProvider({
		baseUrl,
		apiKey,
		model,
		classification: 'local',
	});
};

const chat = async () => {
	return newProvider().chat([{ role: ChatRole.User, content: 'Hello' }]);
};

const toolLoopMessages = (firstResult: ChatResult, toolOutput: ChatMessage['content']): ChatMessage[] => {
	return [
		{ role: ChatRole.User, content: 'Weather in Paris?' },
		{ role: ChatRole.Assistant, content: firstResult.text, toolCalls: firstResult.toolCalls, responsesState: firstResult.responsesState },
		{
			role: ChatRole.Tool,
			content: toolOutput,
			toolName: 'get_weather',
			toolCallId: 'call_1',
			isError: false,
			userDescription: '',
			isEdit: false,
		},
	];
};

describe('ai/providers/OpenAiCompatible', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	afterEach(() => {
		jest.restoreAllMocks();
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

	it('should use the Responses API when the server supports it', async () => {
		const requests = mockResponsesOutput([reasoningItem, messageItem('Hi!')]);
		const provider = newProvider();
		await provider.chat([{ role: ChatRole.User, content: 'Hello' }]);
		const result = await provider.chat([{ role: ChatRole.User, content: 'Hello' }]);

		expect(requests.map(request => request.path)).toEqual(['/responses', '/responses']);
		expect(result).toMatchObject({
			text: 'Hi!',
			toolCalls: [],
			usage: { inputTokens: 10, outputTokens: 20 },
			finishReason: 'stop',
			reasoningText: 'Thinking...',
			responsesState: undefined,
		});
	});

	test.each([
		['content', [reasoningContentItem, messageItem('Hi!')], 'Hi!'],
		['content without a message', [reasoningContentItem], ''],
	])('should read the reasoning text from %s', async (_label, output, expectedText) => {
		mockResponsesOutput(output);
		const result = await chat();
		expect(result.text).toBe(expectedText);
		expect(result.reasoningText).toBe('Thinking...');
	});

	it('should fall back to Chat Completions once when the Responses API returns 404', async () => {
		const requests = mockChatResponse({ content: 'OK' }, 'stop');
		const provider = newProvider();
		await provider.chat([{ role: ChatRole.User, content: 'Hello' }]);
		const result = await provider.chat([{ role: ChatRole.User, content: 'Hello' }]);

		expect(requests.map(request => request.path)).toEqual(['/responses', '/chat/completions', '/chat/completions']);
		expect(result.text).toBe('OK');
	});

	it('should try the Responses API again when the fallback also fails', async () => {
		let modelInstalled = false;
		const modelNotFound = () => jsonResponse({ error: { message: 'model \'test-model\' not found' } }, 404);
		const requests = mockOpenAiServer(baseUrl, {
			'/responses': () => modelInstalled ? jsonResponse(responsesBody([messageItem('Hi!')])) : modelNotFound(),
			'/chat/completions': modelNotFound,
		});
		const provider = newProvider();
		await expect(provider.chat([{ role: ChatRole.User, content: 'Hello' }])).rejects.toThrow('AI provider returned 404: model \'test-model\' not found');

		modelInstalled = true;
		const result = await provider.chat([{ role: ChatRole.User, content: 'Hello' }]);

		expect(requests.map(request => request.path)).toEqual(['/responses', '/chat/completions', '/responses']);
		expect(result.text).toBe('Hi!');
	});

	test.each([400, 401])('should not fall back to Chat Completions on error %s', async (status) => {
		const requests = mockOpenAiServer(baseUrl, {
			'/responses': () => jsonResponse({ error: { message: 'Something failed' } }, status),
			'/chat/completions': () => jsonResponse({ choices: [{ message: { content: 'OK' } }] }),
		});
		await expect(chat()).rejects.toThrow(`AI provider returned ${status}: Something failed`);
		expect(requests.map(request => request.path)).toEqual(['/responses']);
	});

	it('should not fall back to Chat Completions after the Responses API has worked', async () => {
		let responsesCallCount = 0;
		const requests = mockOpenAiServer(baseUrl, {
			'/responses': () => {
				responsesCallCount++;
				return responsesCallCount === 1 ? jsonResponse(responsesBody([messageItem('Hi!')])) : new Response('', { status: 404 });
			},
			'/chat/completions': () => jsonResponse({ choices: [{ message: { content: 'OK' } }] }),
		});
		const provider = newProvider();
		await provider.chat([{ role: ChatRole.User, content: 'Hello' }]);
		await expect(provider.chat([{ role: ChatRole.User, content: 'Hello' }])).rejects.toThrow('AI provider returned 404');
		expect(requests.map(request => request.path)).toEqual(['/responses', '/responses']);
	});

	it('should map the request options to the Responses API', async () => {
		const requests = mockResponsesOutput([messageItem('{"answer":"Paris"}')]);
		await newProvider().chat([
			{ role: ChatRole.System, content: 'Be brief' },
			{ role: ChatRole.User, content: 'Capital of France?' },
		], {
			maxTokens: 100,
			tools: [weatherTool],
			responseFormat: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: { type: 'object' } } },
		});

		expect(requests[0].body).toEqual({
			model: 'test-model',
			input: [
				{ role: 'system', content: 'Be brief' },
				{ role: 'user', content: 'Capital of France?' },
			],
			stream: false,
			store: false,
			include: ['reasoning.encrypted_content'],
			max_output_tokens: 100,
			text: { format: { type: 'json_schema', name: 'answer', strict: true, schema: { type: 'object' } } },
			tools: [{ type: 'function', name: 'get_weather', description: 'Gets the weather', parameters: weatherTool.inputSchema }],
		});
	});

	it('should retry without the schema when the model rejects structured output', async () => {
		const requests = mockOpenAiServer(baseUrl, {
			'/responses': body => body.text
				? jsonResponse({ error: { message: 'Invalid parameter: \'text.format\' of type \'json_schema\' is not supported with this model.' } }, 400)
				: jsonResponse(responsesBody([messageItem('Hi!')])),
		});
		const result = await newProvider().chat([{ role: ChatRole.User, content: 'Hello' }], {
			responseFormat: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: { type: 'object' } } },
		});

		expect(requests.map(request => request.path)).toEqual(['/responses', '/responses']);
		expect(requests[1].body.text).toBeUndefined();
		expect(result.text).toBe('Hi!');
	});

	test.each([
		[{ status: 'completed' }, 'stop'],
		[{ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }, 'length'],
		[{ status: 'incomplete', incomplete_details: { reason: 'content_filter' } }, 'other'],
	])('should map Responses API status %j to finish reason %s', async (status, expected) => {
		mockResponsesOutput([messageItem('Hi!')], status);
		const result = await chat();
		expect(result.finishReason).toBe(expected);
	});

	it('should send reasoning back with the tool result to the same model and API key only', async () => {
		const requests = mockResponsesOutput([reasoningItem, functionCallItem]);
		const provider = newProvider();
		const firstResult = await provider.chat([{ role: ChatRole.User, content: 'Weather in Paris?' }], { tools: [weatherTool] });

		expect(firstResult.toolCalls).toEqual([{ toolName: 'get_weather', callId: 'call_1', arguments: { city: 'Paris' }, parseError: null }]);
		expect(firstResult.finishReason).toBe('tool_calls');

		const messages = toolLoopMessages(firstResult, 'Sunny');
		await provider.chat(messages, { tools: [weatherTool] });
		const toolOutputItem = { type: 'function_call_output', call_id: 'call_1', output: 'Sunny' };
		expect(requests[1].body.input).toEqual([
			{ role: 'user', content: 'Weather in Paris?' },
			reasoningItem,
			functionCallItem,
			toolOutputItem,
		]);

		await newProvider('other-model').chat(messages, { tools: [weatherTool] });
		await newProvider('test-model', 'other-key').chat(messages, { tools: [weatherTool] });
		expect(requests).toHaveLength(4);
		for (const request of requests.slice(2)) {
			expect(request.body.input).toEqual([
				{ role: 'user', content: 'Weather in Paris?' },
				{ type: 'function_call', call_id: 'call_1', name: 'get_weather', arguments: '{"city":"Paris"}' },
				toolOutputItem,
			]);
		}
	});

	it('should send image tool results as images', async () => {
		const requests = mockResponsesOutput([functionCallItem]);
		const provider = newProvider();
		const firstResult = await provider.chat([{ role: ChatRole.User, content: 'Weather in Paris?' }], { tools: [weatherTool] });

		const dataUrl = 'data:image/png;base64,AAAA';
		const image = new ToolImageResponse({ dataUrl, mimeType: 'image/png', id: '0123456789abcdef0123456789abcdef' });
		await provider.chat(toolLoopMessages(firstResult, image), { tools: [weatherTool] });
		expect(requests[1].body.input).toContainEqual({
			type: 'function_call_output',
			call_id: 'call_1',
			output: [{ type: 'input_image', image_url: dataUrl }],
		});
	});

});
