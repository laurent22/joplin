import shim from '../../../shim';
import JoplinError from '../../../JoplinError';
import Logger from '@joplin/utils/Logger';
import { ChatMessage, ChatOptions, ChatResult, ProviderClassification } from '../types';
import ChatProviderBase from './ChatProviderBase';

const logger = Logger.create('AnthropicProvider');

interface AnthropicUsage {
	input_tokens?: number;
	output_tokens?: number;
}

interface AnthropicContentBlock {
	type?: string;
	text?: string;
}

interface AnthropicResponse {
	content?: AnthropicContentBlock[];
	usage?: AnthropicUsage;
	error?: { message?: string };
}

interface Options {
	apiKey: string;
	model: string;
}

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
		const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content);
		const turnMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

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

		const doRequest = async () => {
			const response = await shim.fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': this.apiKey_,
					'anthropic-version': '2023-06-01',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
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

		const content = (json.content ?? [])
			.filter(b => b.type === 'text' && typeof b.text === 'string')
			.map(b => b.text)
			.join('');

		const inputTokens = json.usage?.input_tokens ?? 0;
		const outputTokens = json.usage?.output_tokens ?? 0;

		return { text: content, usage: { inputTokens, outputTokens } };
	}
}
