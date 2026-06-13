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

// Produces embedding vectors for arbitrary text. Implemented by the bundled
// local provider (ONNX-backed, lands in a follow-up PR) and by a test stub
// used in CI to exercise the indexer without a real model.
//
// `modelId` is stored alongside each chunk in note_embeddings_meta. When the
// active provider's `modelId` differs from the value last seen by the indexer,
// the index is cleared and rebuilt — vectors from different models aren't
// comparable.
//
// `dimension` is the size of the vectors returned by `embed()`. It controls
// the FLOAT[] size of the sqlite-vec virtual table, which is fixed at the
// table's first creation.
export interface EmbeddingProvider {
	id: string;
	modelId: string;
	dimension: number;
	classification: ProviderClassification;
	embed(texts: string[]): Promise<number[][]>;
}
