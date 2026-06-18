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

// Produces embedding vectors for text.
// - modelId is stored per chunk; a change triggers a full re-index.
// - dimension is fixed at first vec-table creation.
export type ProviderModelDownloadStatus = 'not-started' | 'downloading' | 'downloaded';

export type ModelDownloadStatus = ProviderModelDownloadStatus | 'unavailable';
export type IndexerState = 'idle' | 'running' | 'ai-disabled' | 'index-disabled';
export interface IndexStatus {
	modelDownloadStatus: ModelDownloadStatus;
	indexerState: IndexerState;
	notesIndexed: number;
	totalNotes: number;
}

export interface EmbeddingProvider {
	id: string;
	modelId: string;
	dimension: number;
	classification: ProviderClassification;
	embed(texts: string[]): Promise<number[][]>;
	// Asymmetric providers (e5) get better retrieval with a query-side
	// encoding. Symmetric providers omit it and callers fall back to embed().
	embedQuery?(texts: string[]): Promise<number[][]>;
	// Providers without a downloadable artefact omit this; the reporter
	// treats them as always-ready.
	modelDownloadStatus?(): Promise<ProviderModelDownloadStatus>;
}
