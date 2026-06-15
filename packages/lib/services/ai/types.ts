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

// Provider-internal lifecycle state of the model artefact. The status
// reporter widens this to include 'unavailable' (no provider active at
// all), which providers themselves can't observe.
export type ProviderModelDownloadStatus = 'not-started' | 'downloading' | 'downloaded';

// Combined model + indexer state surfaced by EmbeddingIndexer.getStatus().
// Used by the settings panel — kept internal to lib/ for now.
export type ModelDownloadStatus = ProviderModelDownloadStatus | 'unavailable';
// 'ai-disabled' = the top-level AI toggle is off.
// 'index-disabled' = AI is on but the indexer toggle is off (chat-only mode).
// 'idle' = settings are on and the background indexer is waiting for its
//   next tick or there's nothing new to do.
// 'running' = a maintenance tick is currently processing notes.
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
	// Optional query-side embedding. Some models (e5 family) get noticeably
	// better retrieval when documents and queries are encoded with different
	// prefixes; this method lets the provider apply the query-side one.
	// Providers without an asymmetric setup can omit it — callers fall back
	// to embed().
	embedQuery?(texts: string[]): Promise<number[][]>;
	// Optional status accessor for surfacing model lifecycle in the UI.
	// Providers that don't have a downloadable artefact can omit this; the
	// status reporter then treats them as always-ready.
	modelDownloadStatus?(): Promise<ProviderModelDownloadStatus>;
}
