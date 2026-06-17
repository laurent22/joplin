import Note from '../../../models/Note';
import { McpTool, ToolError } from '../types';

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
		if (!input.id) throw new ToolError('Missing "id" parameter');

		const existing = await Note.load(input.id);
		if (!existing || existing.is_conflict || (existing.deleted_time && existing.deleted_time > 0)) {
			throw new ToolError(`Note not found: ${input.id}`);
		}

		await Note.batchDelete([input.id], { toTrash: true });

		return { id: input.id, trashed: true };
	},
};

export default tool;
