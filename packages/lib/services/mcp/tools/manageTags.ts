import Note from '../../../models/Note';
import Tag from '../../../models/Tag';
import { McpTool, ToolError } from '../types';

interface Input {
	note_id?: string;
	add?: string[];
	remove?: string[];
}

const tool: McpTool = {
	id: 'manage_tags',
	description: 'Add or remove tags on a note. Tags are addressed by title; unknown tags in "add" are created automatically.',
	inputSchema: {
		type: 'object',
		properties: {
			note_id: { type: 'string', description: 'The note id whose tags should change.' },
			add: { type: 'array', items: { type: 'string' }, description: 'Tag titles to attach. Created if missing.' },
			remove: { type: 'array', items: { type: 'string' }, description: 'Tag titles to detach. Ignored if the tag is not attached.' },
		},
		required: ['note_id'],
	},
	handler: async (input: Input) => {
		if (!input.note_id) throw new ToolError('Missing "note_id" parameter');
		if (!input.add?.length && !input.remove?.length) {
			throw new ToolError('Pass at least one of "add" or "remove"');
		}

		const note = await Note.load(input.note_id);
		if (!note || note.is_conflict || (note.deleted_time && note.deleted_time > 0)) {
			throw new ToolError(`Note not found: ${input.note_id}`);
		}

		const added: string[] = [];
		for (const title of input.add ?? []) {
			const trimmed = (title || '').trim();
			if (!trimmed) continue;
			await Tag.addNoteTagByTitle(input.note_id, trimmed);
			added.push(trimmed);
		}

		const removed: string[] = [];
		for (const title of input.remove ?? []) {
			const trimmed = (title || '').trim();
			if (!trimmed) continue;
			const tag = await Tag.loadByTitle(trimmed);
			if (tag) {
				await Tag.removeNote(tag.id, input.note_id);
				removed.push(trimmed);
			}
		}

		const currentTags = await Tag.tagsByNoteId(input.note_id);
		return {
			note_id: input.note_id,
			added,
			removed,
			tags: currentTags.map(t => t.title),
		};
	},
};

export default tool;
