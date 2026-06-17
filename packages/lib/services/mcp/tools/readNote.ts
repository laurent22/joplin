import Note from '../../../models/Note';
import Folder from '../../../models/Folder';
import Tag from '../../../models/Tag';
import { McpTool, ToolError } from '../types';

interface Input {
	id?: string;
	offset?: number;
	max_chars?: number;
}

const defaultMaxChars = 0;

const tool: McpTool = {
	id: 'read_note',
	description: 'Read a single note by id. Returns title, markdown body, notebook name, tags, and timestamps. For very long notes, use offset and max_chars to page through the body.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id (32-character hex).' },
			offset: { type: 'integer', description: 'Byte offset into the body to start at. Defaults to 0.', minimum: 0 },
			max_chars: { type: 'integer', description: 'Maximum characters of body to return. Omit or set to 0 for the full body.', minimum: 0 },
		},
		required: ['id'],
	},
	handler: async (input: Input) => {
		if (!input.id) throw new ToolError('Missing "id" parameter');

		const note = await Note.load(input.id);
		if (!note || note.is_conflict || (note.deleted_time && note.deleted_time > 0)) {
			throw new ToolError(`Note not found: ${input.id}`);
		}

		const folder = note.parent_id ? await Folder.load(note.parent_id) : null;
		const tags = await Tag.tagsByNoteId(note.id);

		const fullBody = note.body ?? '';
		const offset = Math.max(0, input.offset ?? 0);
		const maxChars = Math.max(0, input.max_chars ?? defaultMaxChars);
		const end = maxChars > 0 ? Math.min(fullBody.length, offset + maxChars) : fullBody.length;
		const body = fullBody.slice(offset, end);

		return {
			id: note.id,
			title: note.title,
			body,
			body_length: fullBody.length,
			body_offset: offset,
			body_returned_chars: body.length,
			has_more: end < fullBody.length,
			notebook_id: note.parent_id,
			notebook_title: folder ? folder.title : null,
			tags: tags.map(t => t.title),
			is_todo: !!note.is_todo,
			todo_completed: !!note.todo_completed,
			created_time: note.created_time,
			updated_time: note.updated_time,
		};
	},
};

export default tool;
