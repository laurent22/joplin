import shim from '../../../shim';
import JoplinError from '../../../JoplinError';
import Logger from '@joplin/utils/Logger';
import { rtrimSlashes } from '@joplin/utils/path';
import { ChatMessage, ChatOptions, ChatResult, ChatToolCall, ProviderClassification, ToolSpec } from '../types';
import ChatProviderBase from './ChatProviderBase';

const logger = Logger.create('OpenAiCompatibleProvider');

interface OpenAiUsage {
	prompt_tokens?: number;
	completion_tokens?: number;
}

interface OpenAiToolCall {
	id: string;
	index: number;
	type: 'function';
	function: {
		arguments: string;
		name: string;
	};
}

interface OpenAiMessage {
	content?: string;
	tool_calls?: OpenAiToolCall[];
}

interface OpenAiChoice {
	message?: OpenAiMessage;
}

interface OpenAiResponse {
	choices?: OpenAiChoice[];
	usage?: OpenAiUsage;
	error?: { message?: string };
}

interface Options {
	baseUrl: string;
	apiKey: string;
	model: string;
	classification: ProviderClassification;
}

const convertTool = (tool: ToolSpec) => {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.inputSchema,
			strict: true,
		},
	};
};

const convertMessage = (message: ChatMessage) => {
	if (message.role === 'tool') {
		return {
			role: 'tool',
			name: message.toolName,
			content: message.content,
			tool_call_id: message.toolCallId,
		};
	} else {
		return {
			role: message.role,
			content: message.content,
			...(message.toolCalls ? {
				tool_calls: message.toolCalls.map(call => {
					return {
						id: call.callId,
						type: 'function',
						function: {
							name: call.toolName,
							arguments: JSON.stringify(call.arguments),
						},
					};
				}),
			} : {}),
		};
	}
};

export interface ChatRequestOptions {
	signal?: AbortSignal;
}

export interface OpenAiChatResponse {
	response: { status: number };
	json: OpenAiResponse;
}

export default class OpenAiCompatibleProvider extends ChatProviderBase {

	public id = 'openai-compatible';
	public classification: ProviderClassification;
	private baseUrl_: string;
	private apiKey_: string;
	private model_: string;

	public constructor(options: Options) {
		super();
		this.baseUrl_ = rtrimSlashes(options.baseUrl);
		this.apiKey_ = options.apiKey;
		this.model_ = options.model;
		this.classification = options.classification;
	}

	protected async doChat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
		if (!this.model_) throw new JoplinError('OpenAI-compatible provider has no model configured', 'aiProviderNotConfigured');

		const body: Record<string, unknown> = {
			model: this.model_,
			messages: messages.map(convertMessage),
			stream: false,
		};
		if (options?.temperature !== undefined) body.temperature = options.temperature;
		if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
		if (options?.responseFormat !== undefined) body.response_format = options.responseFormat;
		if (options?.tools !== undefined) body.tools = options.tools.map(convertTool);


		const doFetch = () => this.sendChatRequest(body, { signal: options?.signal });

		let { response, json } = await doFetch();

		// Newer OpenAI models (o1/o3/gpt-5/...) reject `max_tokens` and require
		// `max_completion_tokens`. Older models and many OpenAI-compatible
		// servers only know `max_tokens`. Retry once with the new name when the
		// server tells us so.
		const errorMessage = () => json?.error?.message ?? '';
		if (response.status === 400 && 'max_tokens' in body && /max_completion_tokens/i.test(errorMessage())) {
			body.max_completion_tokens = body.max_tokens;
			delete body.max_tokens;
			({ response, json } = await doFetch());
		}

		// Older OpenAI models might reject `response_format` json_schema (see https://stackoverflow.com/q/79039544).
		// For compatibility, retry without response_format on failure:
		if (response.status === 400 && 'response_format' in body && /json_schema|response_format/i.test(errorMessage())) {
			logger.warn(`Model ${this.model_} rejected response_format; retrying without structured output schema.`);
			delete body.response_format;
			({ response, json } = await doFetch());
		}

		if (response.status >= 400) {
			const detail = json?.error?.message ? `: ${json.error.message}` : '';
			throw new JoplinError(`AI provider returned ${response.status}${detail}`, response.status);
		}

		// A 2xx response with no `choices` array usually means the endpoint URL
		// is wrong (e.g. user forgot the `/v1` suffix on a local server) — many
		// such servers reply 200 with an empty body rather than 404. Surface
		// this rather than returning an empty string the caller can't diagnose.
		if (!Array.isArray(json.choices)) {
			throw new JoplinError(
				`AI provider returned an unexpected response shape. The base URL is likely wrong — for OpenAI, Ollama, and LM Studio the URL must end with "/v1" (got ${this.baseUrl_}).`,
				'aiProviderBadResponse',
			);
		}

		const responseMessage = json.choices?.[0]?.message;
		const content = responseMessage?.content ?? '';
		// Some "OpenAI-compatible" providers (notably older Ollama versions)
		// omit `usage` entirely. Default to zeros rather than throw.
		const inputTokens = json.usage?.prompt_tokens ?? 0;
		const outputTokens = json.usage?.completion_tokens ?? 0;

		const toolCalls: ChatToolCall[] = (responseMessage?.tool_calls ?? []).map(call => {
			if (!call.function) return null;
			return {
				toolName: call.function.name,
				callId: call.id,
				arguments: JSON.parse(call.function.arguments),
			};
		}).filter(toolCall => !!toolCall);

		return { text: content, toolCalls, usage: { inputTokens, outputTokens } };
	}

	protected async sendChatRequest(body: Record<string, unknown>, options: ChatRequestOptions): Promise<OpenAiChatResponse> {
		if (!this.baseUrl_) throw new JoplinError('OpenAI-compatible provider has no base URL configured', 'aiProviderNotConfigured');

		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.apiKey_) headers['Authorization'] = `Bearer ${this.apiKey_}`;

		const response = await shim.fetch(`${this.baseUrl_}/chat/completions`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: options.signal,
		});

		const text = await response.text();
		let json: OpenAiResponse;
		try {
			json = JSON.parse(text) as OpenAiResponse;
		} catch {
			throw new JoplinError(`AI provider returned non-JSON response: ${text.slice(0, 200)}`, response.status);
		}
		return {
			response: { status: response.status },
			json,
		};
	}
}
