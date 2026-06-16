import Note from '../../../models/Note';
import Folder from '../../../models/Folder';
import { NoteEntity } from '../../database/types';
import { McpTool } from '../types';

interface Input {
	id?: string;
	title?: string;
	body?: string;
	notebook_id?: string;
	todo_completed?: boolean;
}

const tool: McpTool = {
	id: 'update_note',
	description: 'Update an existing note. Only the fields you pass are changed; omitted fields keep their current value.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id to update.' },
			title: { type: 'string', description: 'New title.' },
			body: { type: 'string', description: 'New body in Markdown. Replaces the existing body — pass the full content, not a diff.' },
			notebook_id: { type: 'string', description: 'Move the note to a different notebook by passing its id.' },
			todo_completed: { type: 'boolean', description: 'For to-do notes: mark as completed (true) or open (false).' },
		},
		required: ['id'],
	},
	handler: async (input: Input) => {
		if (!input.id) {
			return { content: [{ type: 'text', text: 'Missing "id" parameter' }], isError: true };
		}

		const existing = await Note.load(input.id);
		if (!existing || existing.is_conflict || (existing.deleted_time && existing.deleted_time > 0)) {
			return { content: [{ type: 'text', text: `Note not found: ${input.id}` }], isError: true };
		}

		if (input.notebook_id) {
			const folder = await Folder.load(input.notebook_id);
			if (!folder) {
				return { content: [{ type: 'text', text: `Notebook not found: ${input.notebook_id}` }], isError: true };
			}
		}

		const patch: NoteEntity = { id: input.id };
		if (input.title !== undefined) patch.title = input.title;
		if (input.body !== undefined) patch.body = input.body;
		if (input.notebook_id !== undefined) patch.parent_id = input.notebook_id;
		if (input.todo_completed !== undefined) patch.todo_completed = input.todo_completed ? Date.now() : 0;

		const saved = await Note.save(patch);

		const payload = { id: saved.id, updated_time: saved.updated_time };
		return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
	},
};

export default tool;
