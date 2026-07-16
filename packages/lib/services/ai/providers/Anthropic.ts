import shim from '../../../shim';
import JoplinError from '../../../JoplinError';
import Logger from '@joplin/utils/Logger';
import { ChatMessage, ChatOptions, ChatResult, ChatRole, ChatToolCall, ProviderClassification } from '../types';
import ChatProviderBase from './ChatProviderBase';

const logger = Logger.create('AnthropicProvider');

interface AnthropicUsage {
	input_tokens?: number;
	output_tokens?: number;
}

interface AnthropicTextContentBlock {
	type: 'text';
	text: string;
}

interface AnthropicToolUseContentBlock {
	type: 'tool_use';
	id: string;
	name: string;
	input: Record<string, unknown>;
}

interface AnthropicToolResultContentBlock {
	type: 'tool_result';
	tool_use_id: string;
	content: string;
}

type AnthropicContentBlock = AnthropicToolUseContentBlock|AnthropicToolResultContentBlock|AnthropicTextContentBlock;

interface AnthropicResponse {
	content?: AnthropicContentBlock[];
	usage?: AnthropicUsage;
	error?: { message?: string };
}

interface Options {
	apiKey: string;
	model: string;
}

interface AnthropicMessage {
	role: 'user'|'assistant';
	content: string|AnthropicContentBlock[];
}

// Anthropic requires tool results to come immediately after their calls, with parallel tool calls in the same block. This block merges adjacent tool calls.
const fixToolResults = (messages: AnthropicMessage[]) => {
	const result: (AnthropicMessage|null)[] = [...messages];

	const getPrevious = (index: number) => {
		for (let i = index - 1; i >= 0; i--) {
			if (!result[i]) continue;
			return result[i];
		}
		return null;
	};

	let previousHadToolResults = false;
	for (let i = 0; i < result.length; i++) {
		const previous = getPrevious(i);
		const message = result[i];
		if (!message) continue;

		let hasToolResults = false;
		if (Array.isArray(message.content) && previous) {
			const toolResults = message.content.filter(item => item.type === 'tool_result');
			hasToolResults ||= toolResults.length > 0;
			if (hasToolResults && previousHadToolResults) {
				if (!Array.isArray(previous.content)) throw new Error('Invalid state: Expected previous.content to be an array');
				previous.content = [...previous.content, ...toolResults];
				message.content = message.content.filter(item => item.type !== 'tool_result');

				// Avoid empty user messages
				if (message.content.length === 0) {
					result[i] = null;
				}
			}
		}

		previousHadToolResults = hasToolResults;
	}

	return result.filter(item => !!item);
};


const convertMessages = (messages: ChatMessage[]) => {
	const convertToolCall = (toolCall: ChatToolCall) => {
		return {
			type: 'tool_use' as const,
			name: toolCall.toolName,
			id: toolCall.callId,
			input: toolCall.arguments,
		};
	};

	const result = messages
		.map((message): AnthropicMessage => {
			if (message.role === ChatRole.System) return null;
			if (message.role === ChatRole.Tool) {
				return {
					role: 'user',
					content: [
						{
							type: 'tool_result',
							tool_use_id: message.toolCallId,
							content: message.content,
							...(message.isError ? { is_error: true } : {}),
						},
					],
				};
			} else if (message.role === ChatRole.Assistant || message.role === ChatRole.User) {
				return {
					role: message.role,
					content: message.toolCalls ? [
						message.content ? { type: 'text' as const, text: message.content } : null,
						...message.toolCalls.map(convertToolCall),
					].filter(item => !!item) : message.content,
				};
			}
			const exhaustivenessCheck: never = message.role;
			throw new Error(`Unsupported role ${exhaustivenessCheck}`);
		})
		.filter(m => !!m);

	const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content);
	const turnMessages = fixToolResults(result);
	return { systemMessages, turnMessages };
};

// Anthropic requires max_tokens. We pick a sensible default if the caller
// doesn't supply one, so plugins don't have to remember a provider-specific
// requirement.
const DEFAULT_MAX_TOKENS = 4096;

export default class AnthropicProvider extends ChatProviderBase {

	public id = 'anthropic';
	public classification: ProviderClassification = 'remote';
	private apiKey_: string;
	private model_: string;

	public constructor(options: Options) {
		super();
		this.apiKey_ = options.apiKey;
		this.model_ = options.model;
	}

	protected async doChat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
		if (!this.apiKey_) throw new JoplinError('Anthropic provider has no API key configured', 'aiProviderNotConfigured');
		if (!this.model_) throw new JoplinError('Anthropic provider has no model configured', 'aiProviderNotConfigured');

		// Anthropic's API separates system prompts from the messages array.
		const { systemMessages, turnMessages } = convertMessages(messages);

		const body: Record<string, unknown> = {
			model: this.model_,
			messages: turnMessages,
			max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
		};
		if (systemMessages.length) body.system = systemMessages.join('\n\n');
		if (options?.temperature !== undefined) body.temperature = options.temperature;
		if (options?.responseFormat?.type === 'json_schema') {
			// Anthropic's API accepts the schema property directly:
			const schema = options.responseFormat.json_schema.schema;
			body.output_config = {
				format: {
					type: options.responseFormat.type,
					schema,
				},
			};
		}
		if (options?.tools) {
			body.tools = options.tools.map(tool => {
				return {
					name: tool.name,
					description: tool.description,
					input_schema: tool.inputSchema,
				};
			});
		}

		const doRequest = async () => {
			const response = await shim.fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': this.apiKey_,
					'anthropic-version': '2023-06-01',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
				signal: options.signal,
			});
			return { response, text: await response.text() };
		};

		// Older Anthropic models may not support the "output_config" property:
		let { response, text } = await doRequest();
		if (response.status === 400 && body.output_config && /output_config|json_schema/.test(text)) {
			logger.warn(`Model ${this.model_} rejected output_config; retrying without structured output schema.`);
			delete body.output_config;
			({ response, text } = await doRequest());
		}

		let json: AnthropicResponse;
		try {
			json = JSON.parse(text) as AnthropicResponse;
		} catch {
			throw new JoplinError(`Anthropic returned non-JSON response: ${text.slice(0, 200)}`, response.status);
		}

		if (response.status >= 400) {
			const detail = json?.error?.message ? `: ${json.error.message}` : '';
			throw new JoplinError(`Anthropic returned ${response.status}${detail}`, response.status);
		}


		const inputTokens = json.usage?.input_tokens ?? 0;
		const outputTokens = json.usage?.output_tokens ?? 0;

		const toolCalls: ChatToolCall[] = [];
		const textMessages = [];
		for (const response of json.content) {
			if (response.type === 'tool_use' && typeof response.input === 'object') {
				toolCalls.push({
					callId: response.id,
					toolName: response.name,
					arguments: response.input,
					parseError: null,
				});
			} else if (response.type === 'text' && typeof response.text === 'string') {
				textMessages.push(response.text);
			}
		}

		return { text: textMessages.join(''), toolCalls, usage: { inputTokens, outputTokens } };
	}
}

// For testing
export const _internal = { convertMessages };
