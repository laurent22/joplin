/* eslint-disable multiline-comment-style */

import AiService from '../../ai/AiService';
import EmbeddingIndexer from '../../ai/EmbeddingIndexer';
import SearchService from '../../ai/SearchService';
import { AiIndexStatus, ChatMessage, ChatOptions, EmbeddingsPage, GetEmbeddingsOptions, SearchOptions, SearchResult } from './types';

/**
 * Provides access to AI models configured by the user. The active provider
 * (Joplin Cloud AI, OpenAI-compatible, or Anthropic) and the model are picked
 * by the user in the Joplin settings — plugins inherit whichever is active.
 *
 * AI is disabled by default. The user must enable it in the settings, and
 * separately grant permission to use a remote (cloud-hosted) provider before
 * any plugin call will succeed.
 *
 * If the user is signed into Joplin Cloud, AI works zero-config — they only
 * need to flip the master toggle on.
 *
 * <span class="platform-desktop">desktop</span>
 */
export default class JoplinAi {

	/**
	 * Sends a chat completion request to the active AI provider and returns the
	 * assistant's text response.
	 *
	 * The active provider and model are controlled by the user in Settings →
	 * AI. Plugins should not assume any particular provider or model.
	 *
	 * This call throws when:
	 *
	 * - AI features are disabled (`AI features are disabled`).
	 * - The active provider is remote and the user has not allowed remote
	 *   providers (`Remote AI access is not allowed`).
	 * - The provider is misconfigured, e.g. missing API key or model name
	 *   (`*provider* has no API key configured`).
	 * - The provider returns an HTTP error (the message includes the status
	 *   and any detail returned by the provider).
	 *
	 * Plugins should catch these errors and present a user-friendly message
	 * pointing the user at the Joplin settings.
	 *
	 * @example
	 * ```typescript
	 * const reply = await joplin.ai.chat([
	 *     { role: 'system', content: 'You are a concise assistant.' },
	 *     { role: 'user', content: 'Summarise this note: ...' },
	 * ]);
	 * console.log(reply);
	 * ```
	 */
	public async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
		const result = await AiService.instance().chat(messages, options);
		return result.text;
	}

	/**
	 * Runs a semantic search against the locally-indexed embeddings and
	 * returns matching chunks ranked by similarity.
	 *
	 * The `query` is either plain text (which gets embedded internally) or
	 * `{ noteId }`, which reuses the note's already-indexed chunks as the
	 * query — useful for "find related notes" / tag suggestion / semantic
	 * graph use cases without spending another embedding pass.
	 *
	 * The `scope` restricts the search: `'all'` (default), `'note'`,
	 * `'folder'` (by folder id), or `'tag'` (by tag id).
	 * Trashed and conflict notes are excluded from results.
	 *
	 * The `relevance` preset controls how strict the match is:
	 * `'strict' | 'normal' | 'loose'`. Joplin owns the mapping from preset
	 * to model-specific (k, minScore) — plugins write against the preset
	 * and stay compatible when the bundled model changes.
	 *
	 * Throws when AI features are disabled or no embedding provider is
	 * active (e.g. ONNX failed to load on this platform).
	 *
	 * @example
	 * ```typescript
	 * const results = await joplin.ai.search({
	 *     query: { text: 'pizza dough hydration' },
	 *     relevance: 'normal',
	 * });
	 * for (const r of results) {
	 *     console.log(r.score, r.noteId, r.chunkText.slice(0, 80));
	 * }
	 * ```
	 */
	public async search(options: SearchOptions): Promise<SearchResult[]> {
		return SearchService.instance().search(options);
	}

	/**
	 * Returns raw embedding vectors for indexed note chunks, paginated.
	 *
	 * Unlike {@link search}, this exposes the underlying vectors rather than
	 * similarity scores — intended for plugins that need to run their own
	 * clustering, dimensionality reduction, or distance computations over the
	 * full set.
	 *
	 * Vectors are model-specific: the response includes the `modelId` that
	 * produced them. Plugins that cache vectors must invalidate on `modelId`
	 * change. If the model swaps mid-pagination, the cursor stops returning
	 * rows; the plugin should restart with no cursor and the new `modelId`.
	 *
	 * Pagination uses an opaque cursor. Pass `nextCursor` from one call back
	 * as `cursor` on the next. A missing `nextCursor` signals end-of-stream.
	 *
	 * The cursor is stable under concurrent writes: chunks inserted behind
	 * the cursor are guaranteed to have been returned; chunks inserted ahead
	 * of the cursor will be returned in a later page.
	 *
	 * Throws when AI features are disabled or no embedding provider is
	 * active.
	 *
	 * @example
	 * ```typescript
	 * let cursor: string | undefined;
	 * const all: EmbeddingChunk[] = [];
	 * let modelId: string | null = null;
	 * do {
	 *     const page = await joplin.ai.getEmbeddings({ cursor, limit: 1000 });
	 *     if (modelId && page.modelId !== modelId) throw new Error('model changed mid-fetch');
	 *     modelId = page.modelId;
	 *     all.push(...page.chunks);
	 *     cursor = page.nextCursor;
	 * } while (cursor);
	 * ```
	 */
	public async getEmbeddings(options?: GetEmbeddingsOptions): Promise<EmbeddingsPage> {
		return SearchService.instance().getEmbeddings(options);
	}

	/**
	 * Returns the current state of the on-device embedding index. Useful for
	 * hybrid pipelines that prefer {@link search} when ready and fall back
	 * otherwise. Cheap enough to call on a UI tick.
	 *
	 * @example
	 * ```typescript
	 * const status = await joplin.ai.getIndexStatus();
	 * if (status.ready) {
	 *     await runOnJoplinAi();
	 * } else {
	 *     await runOnLocalFallback();
	 * }
	 * ```
	 */
	public async getIndexStatus(): Promise<AiIndexStatus> {
		return EmbeddingIndexer.instance().getPluginStatus();
	}

}
