import Logger from '@joplin/utils/Logger';
import NoteEmbedding from '../../models/NoteEmbedding';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import AiService from './AiService';
import { EmbeddingProvider } from './types';
import { SearchOptions, SearchQuery, SearchRelevance, SearchResult, SearchScope } from '../plugins/api/types';

export type { SearchOptions, SearchQuery, SearchRelevance, SearchResult, SearchScope };

const logger = Logger.create('SearchService');

// Semantic search over the local embedding index. Used by the plugin API
// (joplin.ai.search) and, eventually, by core features that want to query
// the vector index without going through the chat layer.
//
// The "relevance" preset is the public contract: it maps to model-specific
// (k, minScore) values. Plugins target the preset; we own the mapping. When
// the bundled model changes, we re-tune the table and plugins keep working.

interface RelevanceTuning {
	k: number;
	minScore: number;
}

// Defaults from the spec, calibrated for multilingual-e5-small. When more
// models are supported, this becomes a per-model map keyed by modelId.
const RELEVANCE_DEFAULTS: Record<SearchRelevance, RelevanceTuning> = {
	strict: { k: 5, minScore: 0.55 },
	normal: { k: 10, minScore: 0.40 },
	loose: { k: 20, minScore: 0.25 },
};

const cosineFromDistance = (distance: number): number => {
	// vec0 stores its distance as L2 (Euclidean) by default. The vectors we
	// index are L2-normalised, so the exact relation L2² = 2·(1 − cosine)
	// holds and we recover cosine similarity as 1 − d²/2. Clamp to [0, 1]
	// so floating-point slop on perfect-match self-queries doesn't surface
	// negatives or values above 1 — and so an opposing-vector edge case
	// (cosine = −1) maps to 0 rather than a negative score.
	const score = 1 - (distance * distance) / 2;
	if (score < 0) return 0;
	if (score > 1) return 1;
	return score;
};

export default class SearchService {

	private static instance_: SearchService;

	public static instance(): SearchService {
		if (!this.instance_) this.instance_ = new SearchService();
		return this.instance_;
	}

	public async search(options: SearchOptions): Promise<SearchResult[]> {
		const provider = AiService.instance().getActiveEmbeddingProvider();
		if (!provider) {
			throw new Error('No embedding provider is active. Enable AI features in Settings → AI.');
		}

		const relevance = options.relevance ?? 'normal';
		const tuning = RELEVANCE_DEFAULTS[relevance];

		const queryVectors = await this.resolveQueryVectors(options.query, provider);
		if (!queryVectors.length) return [];

		const noteIds = await this.resolveScope(options.scope);
		// Scope resolved to an explicit empty list (e.g. tag with no notes).
		// similaritySearch treats an empty noteIds as "search within nothing"
		// — return early without hitting the vec table.
		if (noteIds && noteIds.length === 0) return [];

		// Merge results across multiple query vectors (the `{ noteId }` query
		// produces one vector per chunk). Per (noteId, chunkIndex) we keep the
		// best score seen, then sort and trim to k.
		const best = new Map<string, SearchResult>();
		for (const queryVector of queryVectors) {
			const hits = await NoteEmbedding.similaritySearch(queryVector, {
				k: tuning.k,
				noteIds: noteIds ?? undefined,
			});
			for (const hit of hits) {
				const score = cosineFromDistance(hit.distance);
				if (score < tuning.minScore) continue;
				const key = `${hit.noteId}:${hit.chunkIndex}`;
				const existing = best.get(key);
				if (!existing || score > existing.score) {
					best.set(key, {
						noteId: hit.noteId,
						chunkIndex: hit.chunkIndex,
						chunkText: hit.chunkText,
						score,
					});
				}
			}
		}

		return Array.from(best.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, tuning.k);
	}

	private async resolveQueryVectors(
		query: SearchQuery,
		provider: EmbeddingProvider,
	): Promise<number[][]> {
		if ('text' in query) {
			if (!query.text.trim()) return [];
			// Use the query-side encoding when the provider exposes one (e5
			// and friends). Otherwise fall back to the symmetric path.
			const embedQuery = provider.embedQuery?.bind(provider) ?? provider.embed.bind(provider);
			return embedQuery([query.text]);
		}

		// noteId query: reuse the note's already-indexed chunks as the query
		// vector(s). Avoids re-embedding (cheap, and matches what the indexer
		// stored — so the math is symmetric).
		const vectors = await NoteEmbedding.vectorsByNoteId(query.noteId);
		if (!vectors.length) {
			logger.info(`No embeddings indexed for note ${query.noteId} — returning empty result`);
		}
		return vectors;
	}

	private async resolveScope(scope: SearchScope | undefined): Promise<string[] | null> {
		if (!scope || scope.type === 'all') return null;
		switch (scope.type) {
		case 'note':
			return [scope.noteId];
		case 'folder': {
			const notes = await Note.previews(scope.folderId, { fields: ['id'] });
			return notes.map(n => n.id);
		}
		case 'tag':
			return Tag.noteIds(scope.tagId);
		}
	}
}
