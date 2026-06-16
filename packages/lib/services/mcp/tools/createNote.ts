import Note from '../../../models/Note';
import Folder from '../../../models/Folder';
import { McpTool } from '../types';

interface Input {
	title?: string;
	body?: string;
	notebook_id?: string;
	is_todo?: boolean;
}

const tool: McpTool = {
	id: 'create_note',
	description: 'Create a new note. Returns the created note id. If notebook_id is omitted, the note is created in the default notebook.',
	inputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string', description: 'Note title.' },
			body: { type: 'string', description: 'Note body in Markdown.' },
			notebook_id: { type: 'string', description: 'Optional notebook (folder) id. Use list_notebooks to find ids.' },
			is_todo: { type: 'boolean', description: 'Set to true to create the note as a to-do.' },
		},
		required: ['title'],
	},
	handler: async (input: Input) => {
		if (!input.title || !input.title.trim()) {
			return { content: [{ type: 'text', text: 'Missing "title" parameter' }], isError: true };
		}

		let parentId = input.notebook_id;
		if (parentId) {
			const folder = await Folder.load(parentId);
			if (!folder) {
				return { content: [{ type: 'text', text: `Notebook not found: ${parentId}` }], isError: true };
			}
		} else {
			const defaultFolder = await Folder.defaultFolder();
			if (!defaultFolder) {
				return { content: [{ type: 'text', text: 'No notebook available. Create one first or pass notebook_id.' }], isError: true };
			}
			parentId = defaultFolder.id;
		}

		const saved = await Note.save({
			title: input.title,
			body: input.body ?? '',
			parent_id: parentId,
			is_todo: input.is_todo ? 1 : 0,
		});

		const payload = { id: saved.id, title: saved.title, notebook_id: saved.parent_id };
		return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
	},
};

export default tool;
