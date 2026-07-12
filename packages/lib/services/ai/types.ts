export enum ChatRole {
	System = 'system',
	User = 'user',
	Assistant = 'assistant',
	Tool = 'tool',
}

interface ChatBaseMessage {
	content: string;
}

export interface ChatStandardMessage extends ChatBaseMessage {
	role: ChatRole.System | ChatRole.User | ChatRole.Assistant;
	toolCalls?: ChatToolCall[];
}

export interface ChatToolMessage extends ChatBaseMessage {
	role: ChatRole.Tool;
	toolName: string;
	toolCallId: string;
	isError: boolean;
	// A very brief description of the result that can be shown to the user
	userDescription: string;
}

export type ChatMessage = ChatStandardMessage | ChatToolMessage;

export interface JsonSchema {
	type: string;
	properties?: unknown;
	required?: string[];
	description?: string;
	additionalProperties?: boolean;
}

export interface ResponseFormat {
	type: 'json_schema';
	json_schema: {
		name: string;
		strict: boolean;
		schema: JsonSchema;
	};
}

export interface ToolSpec {
	name: string;
	description: string;
	// Information provided by the model to the tool
	inputSchema: JsonSchema;
}

export interface ChatOptions {
	temperature?: number;
	tools?: ToolSpec[];
	responseFormat?: ResponseFormat;
	maxTokens?: number;
	signal?: AbortSignal;
}

export interface ChatUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface ChatToolCall {
	toolName: string;
	callId: string;
	arguments: Record<string, unknown>;
}

export interface ChatResult {
	text: string;
	toolCalls: ChatToolCall[];
	usage: ChatUsage;
	// Joplin Cloud degradation / budget signals. Populated only by the
	// joplin-cloud provider; other providers leave them undefined. Consumed
	// internally to drive the aiStatus Redux slice — plugins receive only
	// the assistant text via JoplinAi.chat().
	degraded?: boolean;
	tokensUsed?: number;
	tokensBudget?: number;
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
export type IndexerState = 'idle' | 'running' | 'ai-disabled' | 'index-disabled' | 'vector-search-unavailable';
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
