import Note from '../../../models/Note';
import Folder from '../../../models/Folder';
import Tag from '../../../models/Tag';
import { McpTool } from '../types';

interface Input {
	id?: string;
}

const tool: McpTool = {
	id: 'read_note',
	description: 'Read a single note by id. Returns title, markdown body, notebook name, tags, and timestamps. Use search_notes first to discover ids.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id (32-character hex).' },
		},
		required: ['id'],
	},
	handler: async (input: Input) => {
		if (!input.id) {
			return { content: [{ type: 'text', text: 'Missing "id" parameter' }], isError: true };
		}

		const note = await Note.load(input.id);
		if (!note || note.is_conflict || (note.deleted_time && note.deleted_time > 0)) {
			return { content: [{ type: 'text', text: `Note not found: ${input.id}` }], isError: true };
		}

		const folder = note.parent_id ? await Folder.load(note.parent_id) : null;
		const tags = await Tag.tagsByNoteId(note.id);

		const payload = {
			id: note.id,
			title: note.title,
			body: note.body,
			notebook_id: note.parent_id,
			notebook_title: folder ? folder.title : null,
			tags: tags.map(t => t.title),
			is_todo: !!note.is_todo,
			todo_completed: !!note.todo_completed,
			created_time: note.created_time,
			updated_time: note.updated_time,
		};
		return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
	},
};

export default tool;
