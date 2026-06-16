import Folder from '../../../models/Folder';
import { McpTool } from '../types';

interface Input {
	title?: string;
	parent_id?: string;
}

const tool: McpTool = {
	id: 'create_notebook',
	description: 'Create a new notebook. Optionally nest it under an existing notebook by passing parent_id.',
	inputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string', description: 'Notebook title.' },
			parent_id: { type: 'string', description: 'Optional id of the parent notebook to nest under.' },
		},
		required: ['title'],
	},
	handler: async (input: Input) => {
		if (!input.title || !input.title.trim()) {
			return { content: [{ type: 'text', text: 'Missing "title" parameter' }], isError: true };
		}

		if (input.parent_id) {
			const parent = await Folder.load(input.parent_id);
			if (!parent) {
				return { content: [{ type: 'text', text: `Parent notebook not found: ${input.parent_id}` }], isError: true };
			}
		}

		const saved = await Folder.save({
			title: input.title,
			parent_id: input.parent_id ?? '',
		}, { userSideValidation: true });

		const payload = { id: saved.id, title: saved.title, parent_id: saved.parent_id || null };
		return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
	},
};

export default tool;
