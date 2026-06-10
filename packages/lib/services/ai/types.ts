export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
	role: ChatRole;
	content: string;
}

export interface ChatOptions {
	temperature?: number;
	maxTokens?: number;
}

export interface ChatUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface ChatResult {
	text: string;
	usage: ChatUsage;
}

export type ProviderClassification = 'local' | 'remote';

export type ProviderType = 'joplin-cloud' | 'openai-compatible' | 'anthropic';

export interface ChatProvider {
	id: string;
	classification: ProviderClassification;
	chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}
