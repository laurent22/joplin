import { ChatMessage, ChatOptions, SearchOptions, SearchResult } from './types';
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
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
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
    search(options: SearchOptions): Promise<SearchResult[]>;
}
