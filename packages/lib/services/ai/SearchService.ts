import Logger from '@joplin/utils/Logger';
import NoteEmbedding from '../../models/NoteEmbedding';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import AiService from './AiService';
import { EmbeddingProvider } from './types';
import { SearchOptions, SearchQuery, SearchRelevance, SearchResult, SearchScope } from '../plugins/api/types';

export type { SearchOptions, SearchQuery, SearchRelevance, SearchResult, SearchScope };

const logger = Logger.create('SearchService');

// Semantic search over the local embedding index.
// The "relevance" preset is the plugin-facing contract; we own the mapping
// to model-specific (k, minScore) so plugins survive model changes.

interface RelevanceTuning {
	k: number;
	minScore: number;
}

// Tuned for multilingual-e5-small. Becomes a per-model map when we add more.
const RELEVANCE_DEFAULTS: Record<SearchRelevance, RelevanceTuning> = {
	strict: { k: 5, minScore: 0.55 },
	normal: { k: 10, minScore: 0.40 },
	loose: { k: 20, minScore: 0.25 },
};

// vec0 returns L2 distance. Our vectors are L2-normalised, so cosine
// similarity = 1 − d²/2 exactly. Clamp to handle float drift on self-matches
// and opposite-vector edges.
const cosineFromDistance = (distance: number): number => {
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
		// Empty scope = search nothing (e.g. tag with no notes).
		if (noteIds && noteIds.length === 0) return [];

		// noteId queries produce one vector per chunk; merge by (note, chunk),
		// keeping the highest score seen.
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
			// Asymmetric providers (e5) get better retrieval with embedQuery;
			// symmetric ones fall back to embed.
			const embedQuery = provider.embedQuery?.bind(provider) ?? provider.embed.bind(provider);
			return embedQuery([query.text]);
		}

		// Reuse stored vectors so the math stays symmetric and we avoid a
		// re-embed pass.
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
