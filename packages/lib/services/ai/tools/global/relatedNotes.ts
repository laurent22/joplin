import { _ } from '../../../../locale';
import Note from '../../../../models/Note';
import NoteEmbedding from '../../../../models/NoteEmbedding';
import SearchService from '../../../ai/SearchService';
import { ToolError } from '../types';
import buildTool from '../utils/buildTool';

interface Input {
	id?: string;
	notebook_id?: string;
	tag_id?: string;
	relevance?: 'strict' | 'normal' | 'loose';
}

const relevanceValues = ['strict', 'normal', 'loose'];

const tool = buildTool({
	id: 'related_notes',
	userDescription: (input: Input) => _('Found notes related to: %s', input.id || _('(empty)')),
	description: [
		'Find notes similar in meaning to a given note, using the local embeddings index.',
		'Use this to explore notes around one you already know, without inventing a search query.',
		'',
		'Returns one entry per related note, with the note id, its best matching chunk text, and a similarity score. The given note itself is never included. Use read_notes to read several results at once.',
	].join('\n'),
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id (32-character hex) to find related notes for.' },
			notebook_id: { type: 'string', description: 'Optional: limit results to a single notebook.' },
			tag_id: { type: 'string', description: 'Optional: limit results to notes with this tag.' },
			relevance: {
				type: 'string',
				enum: relevanceValues,
				description: 'How strict to be about similarity. "strict" returns fewer high-confidence notes; "loose" returns more candidates.',
				default: 'normal',
			},
		},
		required: ['id'],
	},
	handler: async (input: Input) => {
		if (!input.id) throw new ToolError('Missing "id" parameter');
		if (input.notebook_id && input.tag_id) throw new ToolError('Pass either "notebook_id" or "tag_id", not both');
		if (input.relevance !== undefined && !relevanceValues.includes(input.relevance)) {
			throw new ToolError('Invalid "relevance": must be "strict", "normal" or "loose"');
		}

		// vectorsByNoteId() throws without sqlite-vec and returns [] for several
		// reasons, so tell the cases apart before searching.
		if (!NoteEmbedding.vectorSearchAvailable()) {
			throw new ToolError('Related notes are not supported on this platform: vector search is unavailable (sqlite-vec extension not loaded).');
		}
		if (!await NoteEmbedding.distinctNoteIdCount()) {
			throw new ToolError('AI embeddings are not enabled. Enable them in Settings → AI.');
		}
		if (!await NoteEmbedding.vectorCountByNoteId(input.id)) {
			throw new ToolError(`Note ${input.id} is not indexed yet. Try again once indexing has finished.`);
		}

		const scope = input.notebook_id
			? { type: 'folder' as const, folderId: input.notebook_id }
			: input.tag_id
				? { type: 'tag' as const, tagId: input.tag_id }
				: undefined;

		const hits = await SearchService.instance().relatedNotes(input.id, {
			scope,
			relevance: input.relevance ?? 'normal',
		});

		const notes = hits.length
			? await Note.byIds(hits.map(h => h.noteId), { fields: ['id', 'title', 'parent_id'] })
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
});

export default tool;
