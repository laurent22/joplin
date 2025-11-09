import Logger from '@joplin/utils/Logger';
import BaseService from '../BaseService';
import shim from '../../shim';

const logger = Logger.create('OpenRouterService');

export enum OpenRouterErrorType {
	NetworkError = 'NETWORK_ERROR',
	AuthenticationError = 'AUTHENTICATION_ERROR',
	RateLimitError = 'RATE_LIMIT_ERROR',
	InvalidRequestError = 'INVALID_REQUEST_ERROR',
	ServerError = 'SERVER_ERROR',
	TimeoutError = 'TIMEOUT_ERROR',
	UnknownError = 'UNKNOWN_ERROR',
}

export class OpenRouterError extends Error {
	public type: OpenRouterErrorType;
	public statusCode?: number;
	public retryable: boolean;

	constructor(message: string, type: OpenRouterErrorType, statusCode?: number, retryable: boolean = false) {
		super(message);
		this.name = 'OpenRouterError';
		this.type = type;
		this.statusCode = statusCode;
		this.retryable = retryable;
	}
}

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
	private maxRetries_: number = 3;
	private retryDelay_: number = 1000; // 1 second
	private requestTimeout_: number = 60000; // 60 seconds

	public setApiKey(key: string) {
		this.apiKey_ = key;
	}

	public setDefaultModel(model: string) {
		this.defaultModel_ = model;
	}

	public setMaxRetries(retries: number) {
		this.maxRetries_ = retries;
	}

	public setRequestTimeout(timeout: number) {
		this.requestTimeout_ = timeout;
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
		// Validate API key
		if (!this.apiKey_) {
			throw new OpenRouterError(
				'OpenRouter API key not set. Please configure it in Settings > AI.',
				OpenRouterErrorType.AuthenticationError,
				undefined,
				false
			);
		}

		// Validate messages
		if (!options.messages || options.messages.length === 0) {
			throw new OpenRouterError(
				'No messages provided for chat completion',
				OpenRouterErrorType.InvalidRequestError,
				undefined,
				false
			);
		}

		// Validate message content
		for (const msg of options.messages) {
			if (!msg.content || typeof msg.content !== 'string' || msg.content.trim().length === 0) {
				throw new OpenRouterError(
					'Invalid message content: messages must have non-empty string content',
					OpenRouterErrorType.InvalidRequestError,
					undefined,
					false
				);
			}
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

			const data: OpenRouterResponse = await response.json();

			// Validate response structure
			if (!data.choices || data.choices.length === 0) {
				throw new OpenRouterError(
					'Invalid response from OpenRouter API: no choices returned',
					OpenRouterErrorType.UnknownError,
					undefined,
					false
				);
			}

			if (!data.choices[0].message || !data.choices[0].message.content) {
				throw new OpenRouterError(
					'Invalid response from OpenRouter API: missing message content',
					OpenRouterErrorType.UnknownError,
					undefined,
					false
				);
			}

			return data.choices[0].message.content;
		} catch (error) {
			// If it's already an OpenRouterError, just re-throw
			if (error instanceof OpenRouterError) {
				logger.error('OpenRouter API call failed:', error.message);
				throw error;
			}

			// Wrap unexpected errors
			logger.error('Unexpected error in OpenRouter API call:', error);
			throw new OpenRouterError(
				`Unexpected error: ${error.message || 'Unknown error'}`,
				OpenRouterErrorType.UnknownError,
				undefined,
				false
			);
		}
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private async makeRequest(endpoint: string, method: string = 'GET', body?: unknown, retryCount: number = 0): Promise<Response> {
		const url = `${this.baseUrl_}${endpoint}`;

		const headers: Record<string, string> = {
			'Authorization': `Bearer ${this.apiKey_}`,
			'HTTP-Referer': 'https://luminanotes.app',
			'X-Title': 'Lumina Notes',
		};

		if (method === 'POST') {
			headers['Content-Type'] = 'application/json';
		}

		try {
			// Create timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new OpenRouterError(
					`Request timeout after ${this.requestTimeout_}ms`,
					OpenRouterErrorType.TimeoutError,
					undefined,
					true
				)), this.requestTimeout_);
			});

			// Make the fetch request with timeout
			const fetchPromise = shim.fetch(url, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined,
			});

			const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

			// Handle HTTP errors
			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error');

				// Determine error type based on status code
				switch (response.status) {
					case 401:
					case 403:
						throw new OpenRouterError(
							`Authentication failed: ${errorText}. Please check your API key in Settings > AI.`,
							OpenRouterErrorType.AuthenticationError,
							response.status,
							false
						);

					case 429:
						const shouldRetry = retryCount < this.maxRetries_;
						throw new OpenRouterError(
							`Rate limit exceeded: ${errorText}. ${shouldRetry ? 'Retrying...' : 'Please try again later.'}`,
							OpenRouterErrorType.RateLimitError,
							response.status,
							true
						);

					case 400:
					case 422:
						throw new OpenRouterError(
							`Invalid request: ${errorText}`,
							OpenRouterErrorType.InvalidRequestError,
							response.status,
							false
						);

					case 500:
					case 502:
					case 503:
					case 504:
						const serverRetry = retryCount < this.maxRetries_;
						throw new OpenRouterError(
							`Server error: ${errorText}. ${serverRetry ? 'Retrying...' : 'Please try again later.'}`,
							OpenRouterErrorType.ServerError,
							response.status,
							true
						);

					default:
						throw new OpenRouterError(
							`HTTP ${response.status}: ${errorText}`,
							OpenRouterErrorType.UnknownError,
							response.status,
							response.status >= 500
						);
				}
			}

			return response;

		} catch (error) {
			// If it's already an OpenRouterError, check if we should retry
			if (error instanceof OpenRouterError && error.retryable && retryCount < this.maxRetries_) {
				logger.warn(`Retrying request (attempt ${retryCount + 1}/${this.maxRetries_}):`, error.message);
				await this.sleep(this.retryDelay_ * Math.pow(2, retryCount)); // Exponential backoff
				return this.makeRequest(endpoint, method, body, retryCount + 1);
			}

			// If it's already an OpenRouterError, re-throw it
			if (error instanceof OpenRouterError) {
				throw error;
			}

			// Network or other errors
			if (retryCount < this.maxRetries_) {
				logger.warn(`Network error, retrying (attempt ${retryCount + 1}/${this.maxRetries_}):`, error);
				await this.sleep(this.retryDelay_ * Math.pow(2, retryCount));
				return this.makeRequest(endpoint, method, body, retryCount + 1);
			}

			throw new OpenRouterError(
				`Network error: ${error.message || 'Unknown error'}. Please check your internet connection.`,
				OpenRouterErrorType.NetworkError,
				undefined,
				false
			);
		}
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
