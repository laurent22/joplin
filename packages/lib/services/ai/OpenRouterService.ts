import Logger from '@joplin/utils/Logger';
import BaseService from '../BaseService';
import shim from '../../shim';

const logger = Logger.create('OpenRouterService');

export interface OpenRouterMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface OpenRouterCompletionOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	messages: OpenRouterMessage[];
}

export interface OpenRouterResponse {
	id: string;
	model: string;
	choices: Array<{
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export default class OpenRouterService extends BaseService {
	private static instance_: OpenRouterService = null;

	public static instance(): OpenRouterService {
		if (this.instance_) return this.instance_;
		this.instance_ = new OpenRouterService();
		return this.instance_;
	}

	private apiKey_: string = '';
	private baseUrl_: string = 'https://openrouter.ai/api/v1';
	private defaultModel_: string = 'openai/gpt-4o-mini';

	public setApiKey(key: string) {
		this.apiKey_ = key;
	}

	public setDefaultModel(model: string) {
		this.defaultModel_ = model;
	}

	public async testConnection(): Promise<boolean> {
		try {
			const response = await this.makeRequest('/models', 'GET');
			return response.ok;
		} catch (error) {
			logger.error('Failed to test OpenRouter connection:', error);
			return false;
		}
	}

	public async chat(options: OpenRouterCompletionOptions): Promise<string> {
		if (!this.apiKey_) {
			throw new Error('OpenRouter API key not set. Please configure it in Settings > AI.');
		}

		const model = options.model || this.defaultModel_;
		const temperature = options.temperature !== undefined ? options.temperature : 0.7;
		const maxTokens = options.maxTokens || 4000;

		try {
			const response = await this.makeRequest('/chat/completions', 'POST', {
				model,
				messages: options.messages,
				temperature,
				max_tokens: maxTokens,
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`OpenRouter API error: ${error}`);
			}

			const data: OpenRouterResponse = await response.json();

			if (!data.choices || data.choices.length === 0) {
				throw new Error('No response from OpenRouter API');
			}

			return data.choices[0].message.content;
		} catch (error) {
			logger.error('OpenRouter API call failed:', error);
			throw error;
		}
	}

	private async makeRequest(endpoint: string, method: string = 'GET', body?: unknown) {
		const url = `${this.baseUrl_}${endpoint}`;

		const headers: Record<string, string> = {
			'Authorization': `Bearer ${this.apiKey_}`,
			'HTTP-Referer': 'https://joplin-app.org',
			'X-Title': 'Joplin',
		};

		if (method === 'POST') {
			headers['Content-Type'] = 'application/json';
		}

		return shim.fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	// AI-powered features

	public async summarizeText(text: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant that summarizes text concisely and accurately.',
				},
				{
					role: 'user',
					content: `Please provide a concise summary of the following text:\n\n${text}`,
				},
			],
		});
	}

	public async improveWriting(text: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful writing assistant. Improve the given text while maintaining its core meaning and tone. Fix grammar, improve clarity, and enhance readability.',
				},
				{
					role: 'user',
					content: text,
				},
			],
		});
	}

	public async fixGrammar(text: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a grammar expert. Fix all grammar, spelling, and punctuation errors in the text. Keep the original meaning and style.',
				},
				{
					role: 'user',
					content: text,
				},
			],
		});
	}

	public async translate(text: string, targetLanguage: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: `You are a professional translator. Translate the given text to ${targetLanguage}. Maintain the original tone and meaning.`,
				},
				{
					role: 'user',
					content: text,
				},
			],
		});
	}

	public async expandText(text: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful writing assistant. Expand the given text with more details, examples, and explanations while maintaining coherence.',
				},
				{
					role: 'user',
					content: text,
				},
			],
		});
	}

	public async makeShorter(text: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful editor. Make the text more concise while keeping all important information.',
				},
				{
					role: 'user',
					content: text,
				},
			],
		});
	}

	public async generateTags(text: string, maxTags: number = 5): Promise<string[]> {
		const response = await this.chat({
			messages: [
				{
					role: 'system',
					content: `You are a helpful assistant that generates relevant tags for notes. Generate up to ${maxTags} relevant tags as a comma-separated list. Tags should be lowercase and single words or short phrases.`,
				},
				{
					role: 'user',
					content: `Generate relevant tags for this note:\n\n${text}`,
				},
			],
		});

		// Parse the comma-separated tags
		return response.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
	}

	public async answerQuestion(question: string, context: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant that answers questions based on the provided context.',
				},
				{
					role: 'user',
					content: `Context:\n${context}\n\nQuestion: ${question}`,
				},
			],
		});
	}

	public async continueWriting(text: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a creative writing assistant. Continue the given text naturally and coherently.',
				},
				{
					role: 'user',
					content: text,
				},
			],
		});
	}

	public async customPrompt(text: string, instruction: string): Promise<string> {
		return this.chat({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful AI assistant.',
				},
				{
					role: 'user',
					content: `${instruction}\n\nText:\n${text}`,
				},
			],
		});
	}
}
