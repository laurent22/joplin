import Note from '../../../models/Note';
import { McpTool } from '../types';

interface Input {
	id?: string;
}

const tool: McpTool = {
	id: 'delete_note',
	description: 'Move a note to the trash. The note is not permanently removed and the user can restore it from the trash.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id to trash.' },
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

		await Note.batchDelete([input.id], { toTrash: true });

		return { content: [{ type: 'text', text: JSON.stringify({ id: input.id, trashed: true }, null, 2) }] };
	},
};

export default tool;
