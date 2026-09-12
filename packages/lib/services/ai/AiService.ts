import Setting from '../../models/Setting';
import JoplinError from '../../JoplinError';
import Logger from '@joplin/utils/Logger';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { ChatMessage, ChatOptions, ChatProvider, ChatResult, EmbeddingProvider, ProviderClassification, ProviderType } from './types';
import deriveClassification from './classification';
import ChatProviderBase from './providers/ChatProviderBase';
import OpenAiCompatibleProvider from './providers/OpenAiCompatible';
import AnthropicProvider from './providers/Anthropic';
import JoplinCloudProvider from './providers/JoplinCloud';
import TestProvider from './providers/TestProvider';

const logger = Logger.create('AiService');

// Bridge from packages/lib to a UI store without importing Redux. Desktop
// registers a dispatcher at boot; other apps leave it null and AiService
// silently no-ops. Payload is partial so callers (or the reducer) can bump
// individual fields without clobbering unrelated ones.
export interface AiStatusUpdate {
	degraded?: boolean;
	tokensUsed?: number;
	tokensBudget?: number;
	lastToastShownAt?: number | null;
}

let statusListener_: ((update: AiStatusUpdate)=> void) | null = null;

export const setAiStatusListener = (fn: ((update: AiStatusUpdate)=> void) | null) => {
	statusListener_ = fn;
};

export default class AiService {

	private static instance_: AiService;

	public static instance(): AiService {
		if (!this.instance_) this.instance_ = new AiService();
		return this.instance_;
	}

	private cachedProvider_: ChatProvider | null = null;
	private cachedProviderKey_: string | null = null;

	private currentSettingsKey(): string {
		// Re-builds the provider when any of these change.
		return [
			Setting.value('ai.chat.providerType'),
			Setting.value('ai.chat.baseUrl'),
			Setting.value('ai.chat.apiKey'),
			Setting.value('ai.chat.model'),
		].join('|');
	}

	private buildProvider(): ChatProvider {
		const providerType = Setting.value('ai.chat.providerType') as ProviderType;

		if (providerType === 'joplin-cloud') {
			return this.attachRecorder(new JoplinCloudProvider());
		}

		if (providerType === 'anthropic') {
			return this.attachRecorder(new AnthropicProvider({
				apiKey: Setting.value('ai.chat.apiKey'),
				model: Setting.value('ai.chat.model'),
			}));
		}

		if (providerType === 'openai-compatible') {
			const baseUrl = Setting.value('ai.chat.baseUrl');
			return this.attachRecorder(new OpenAiCompatibleProvider({
				baseUrl,
				apiKey: Setting.value('ai.chat.apiKey'),
				model: Setting.value('ai.chat.model'),
				classification: deriveClassification('openai-compatible', baseUrl),
			}));
		}

		if (providerType === 'test-provider') {
			return this.attachRecorder(new TestProvider());
		}

		throw new JoplinError(`Unknown AI provider type: ${providerType}`, 'aiUnknownProvider');
	}

	private attachRecorder(provider: ChatProviderBase): ChatProvider {
		provider.setUsageRecorder(async (inputTokens, outputTokens) => {
			await this.recordTokens(inputTokens, outputTokens);
		});
		return provider;
	}

	private getProvider(): ChatProvider {
		const key = this.currentSettingsKey();
		if (this.cachedProvider_ && this.cachedProviderKey_ === key) return this.cachedProvider_;
		this.cachedProvider_ = this.buildProvider();
		this.cachedProviderKey_ = key;
		return this.cachedProvider_;
	}

	public effectiveClassification(): ProviderClassification {
		const providerType = Setting.value('ai.chat.providerType') as ProviderType;
		const baseUrl = providerType === 'openai-compatible' ? Setting.value('ai.chat.baseUrl') : '';
		return deriveClassification(providerType, baseUrl);
	}

	public async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
		if (!Setting.value('ai.enabled')) {
			throw new JoplinError('AI features are disabled. Enable them in Settings → AI.', 'aiDisabled');
		}
		if (!messages || !messages.length) {
			throw new JoplinError('Messages array must not be empty', 'aiInvalidRequest');
		}

		const provider = this.getProvider();

		if (provider.classification === 'remote' && !Setting.value('ai.allowRemote')) {
			throw new JoplinError('Remote AI access is not allowed. Enable "Allow remote AI providers" in Settings → AI to use cloud-hosted models.', 'aiRemoteNotAllowed');
		}

		const result = await provider.chat(messages, options);
		this.applyStatusFromResult(result);
		return result;
	}

	// Best-effort: a listener/persistence failure must not turn a successful
	// chat into a failed one.
	private applyStatusFromResult(result: ChatResult) {
		if (result.degraded === undefined && result.tokensUsed === undefined && result.tokensBudget === undefined) return;

		const update: AiStatusUpdate = {};
		if (result.degraded !== undefined) update.degraded = result.degraded;
		if (result.tokensUsed !== undefined) update.tokensUsed = result.tokensUsed;
		if (result.tokensBudget !== undefined) update.tokensBudget = result.tokensBudget;

		try {
			if (statusListener_) statusListener_(update);
		} catch (error) {
			logger.warn('AI status listener failed:', error);
		}

		try {
			const current = Setting.value('ai.status') as unknown as Record<string, unknown>;
			Setting.setValue('ai.status', { ...current, ...update } as never);
		} catch (error) {
			logger.warn('Failed to persist ai.status:', error);
		}
	}

	// Called when ai.enabled flips from false to true. If the user has never
	// made an explicit provider choice and they're on Joplin Cloud sync, switch
	// the default to joplin-cloud. This is a single one-shot write — after it
	// runs, sync target changes never affect the AI provider.
	public applyFirstEnableDefault() {
		if (Setting.value('ai.chat.providerType.configured')) return;
		if (Setting.value('sync.target') === SyncTargetRegistry.nameToId('joplinCloud')) {
			Setting.setValue('ai.chat.providerType', 'joplin-cloud');
			logger.info('Applied first-enable default: joplin-cloud (user is on Joplin Cloud sync)');
		}
		Setting.setValue('ai.chat.providerType.configured', true);
	}

	public invalidateProvider() {
		this.cachedProvider_ = null;
		this.cachedProviderKey_ = null;
	}

	// Embedding provider — set externally by app startup (desktop will install
	// the ONNX-backed local provider in a follow-up PR; tests install the
	// deterministic test stub via setEmbeddingProvider() below). Returns null
	// when no provider has been installed — callers (the indexer, future
	// search APIs) should treat that as "embeddings unavailable" and degrade.
	private embeddingProvider_: EmbeddingProvider | null = null;

	public setEmbeddingProvider(provider: EmbeddingProvider | null) {
		this.embeddingProvider_ = provider;
	}

	public getActiveEmbeddingProvider(): EmbeddingProvider | null {
		return this.embeddingProvider_;
	}

	private async recordTokens(inputTokens: number, outputTokens: number) {
		const prevIn = Setting.value('ai.usage.inputTokens') as number;
		const prevOut = Setting.value('ai.usage.outputTokens') as number;
		Setting.setValue('ai.usage.inputTokens', prevIn + inputTokens);
		Setting.setValue('ai.usage.outputTokens', prevOut + outputTokens);
	}
}
