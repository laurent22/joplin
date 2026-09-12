import Logger from '@joplin/utils/Logger';
import { ChatMessage, ChatOptions, ChatProvider, ChatResult, ProviderClassification } from '../types';

const logger = Logger.create('ChatProviderBase');

export default abstract class ChatProviderBase implements ChatProvider {

	public abstract id: string;
	public abstract classification: ProviderClassification;

	// Subclasses implement the raw call. Token accounting is wrapped around
	// it by `chat()` below so every provider inherits the same bookkeeping.
	protected abstract doChat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;

	public async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
		const result = await this.doChat(messages, options);
		// Usage recording is best-effort — a failure here must not turn a
		// successful chat into a failed one.
		try {
			await this.recordUsage(result.usage.inputTokens, result.usage.outputTokens);
		} catch (error) {
			logger.warn('Failed to record token usage:', error);
		}
		return result;
	}

	// Persisting token counters is wired by AiService — providers don't talk to
	// Setting directly so they stay testable in isolation.
	private recorder_: ((inputTokens: number, outputTokens: number)=> Promise<void>) | null = null;

	public setUsageRecorder(recorder: (inputTokens: number, outputTokens: number)=> Promise<void>) {
		this.recorder_ = recorder;
	}

	private async recordUsage(inputTokens: number, outputTokens: number) {
		if (this.recorder_) await this.recorder_(inputTokens, outputTokens);
	}
}
