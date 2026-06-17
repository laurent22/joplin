import Note from '../../../models/Note';
import SearchService from '../../ai/SearchService';
import { McpTool, ToolError } from '../types';

interface Input {
	query?: string;
	notebook_id?: string;
	tag_id?: string;
	relevance?: 'strict' | 'normal' | 'loose';
}

const tool: McpTool = {
	id: 'semantic_search_notes',
	description: [
		'Semantic search across notes using the local embeddings index.',
		'Use this when the user asks by meaning rather than exact words — for example "the note about pet sitters for my dog" rather than "pet sitter".',
		'Falls back with a clear error if AI embeddings are not enabled in Settings → AI.',
		'',
		'Results are ranked chunks (not whole notes), each with the source note id, the chunk text that matched, and a similarity score. Use read_note on the note id to get full context.',
	].join('\n'),
	inputSchema: {
		type: 'object',
		properties: {
			query: { type: 'string', description: 'Free-text query expressing what to find.' },
			notebook_id: { type: 'string', description: 'Optional: limit search to a single notebook.' },
			tag_id: { type: 'string', description: 'Optional: limit search to notes with this tag.' },
			relevance: {
				type: 'string',
				enum: ['strict', 'normal', 'loose'],
				description: 'How strict to be about similarity. "strict" returns fewer high-confidence chunks; "loose" returns more candidates.',
				default: 'normal',
			},
		},
		required: ['query'],
	},
	handler: async (input: Input) => {
		if (!input.query || !input.query.trim()) throw new ToolError('Missing "query" parameter');
		if (input.notebook_id && input.tag_id) throw new ToolError('Pass either "notebook_id" or "tag_id", not both');

		const scope = input.notebook_id
			? { type: 'folder' as const, folderId: input.notebook_id }
			: input.tag_id
				? { type: 'tag' as const, tagId: input.tag_id }
				: undefined;

		let hits;
		try {
			hits = await SearchService.instance().search({
				query: { text: input.query },
				scope,
				relevance: input.relevance ?? 'normal',
			});
		} catch (error) {
			// SearchService throws when no embedding provider is active — that's
			// a configuration mistake the LLM should report to the user, not an
			// internal bug.
			const message = error instanceof Error ? error.message : 'Semantic search failed';
			throw new ToolError(message);
		}

		const noteIds = Array.from(new Set(hits.map(h => h.noteId)));
		const notes = noteIds.length
			? await Note.byIds(noteIds, { fields: ['id', 'title', 'parent_id'] })
			: [];
		const noteById = new Map(notes.map(n => [n.id, n]));

		const results = hits.map(h => {
			const note = noteById.get(h.noteId);
			return {
				note_id: h.noteId,
				title: note?.title ?? null,
				notebook_id: note?.parent_id ?? null,
				chunk_index: h.chunkIndex,
				chunk_text: h.chunkText,
				score: Math.round(h.score * 1000) / 1000,
			};
		});

		return { results, total: results.length };
	},
};

export default tool;
