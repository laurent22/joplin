import BaseService from '../BaseService';
import OpenRouterService from './OpenRouterService';
import Setting from '../../models/Setting';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('AiService');

export default class AiService extends BaseService {
	private static instance_: AiService = null;
	private openRouter_: OpenRouterService = null;

	public static instance(): AiService {
		if (this.instance_) return this.instance_;
		this.instance_ = new AiService();
		return this.instance_;
	}

	public constructor() {
		super();
		this.openRouter_ = OpenRouterService.instance();
	}

	public async initialize() {
		const apiKey = Setting.value('ai.openRouter.apiKey');
		const model = Setting.value('ai.openRouter.model');

		if (apiKey) {
			this.openRouter_.setApiKey(apiKey);
		}

		if (model) {
			this.openRouter_.setDefaultModel(model);
		}

		logger.info('AI Service initialized');
	}

	public get openRouter(): OpenRouterService {
		return this.openRouter_;
	}

	public isEnabled(): boolean {
		return Setting.value('ai.enabled') === true;
	}

	public hasApiKey(): boolean {
		const apiKey = Setting.value('ai.openRouter.apiKey');
		return !!apiKey && apiKey.length > 0;
	}

	public async checkConfiguration(): Promise<{ enabled: boolean; hasApiKey: boolean; isValid: boolean }> {
		const enabled = this.isEnabled();
		const hasApiKey = this.hasApiKey();
		let isValid = false;

		if (enabled && hasApiKey) {
			try {
				isValid = await this.openRouter_.testConnection();
			} catch (error) {
				logger.error('Failed to test API connection:', error);
			}
		}

		return { enabled, hasApiKey, isValid };
	}

	// Convenience methods that check if AI is enabled before calling

	public async summarize(text: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.summarizeText(text);
	}

	public async improveWriting(text: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.improveWriting(text);
	}

	public async fixGrammar(text: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.fixGrammar(text);
	}

	public async translate(text: string, targetLanguage: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.translate(text, targetLanguage);
	}

	public async expandText(text: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.expandText(text);
	}

	public async makeShorter(text: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.makeShorter(text);
	}

	public async generateTags(text: string, maxTags: number = 5): Promise<string[]> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.generateTags(text, maxTags);
	}

	public async answerQuestion(question: string, context: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.answerQuestion(question, context);
	}

	public async continueWriting(text: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.continueWriting(text);
	}

	public async customPrompt(text: string, instruction: string): Promise<string> {
		if (!this.isEnabled()) throw new Error('AI features are disabled. Enable them in Settings > AI.');
		if (!this.hasApiKey()) throw new Error('OpenRouter API key not set. Configure it in Settings > AI.');
		return this.openRouter_.customPrompt(text, instruction);
	}
}
