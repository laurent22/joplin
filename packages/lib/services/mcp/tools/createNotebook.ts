import Folder from '../../../models/Folder';
import { McpTool, ToolError } from '../types';

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
		if (!input.title || !input.title.trim()) throw new ToolError('Missing "title" parameter');

		if (input.parent_id) {
			const parent = await Folder.load(input.parent_id);
			if (!parent) throw new ToolError(`Parent notebook not found: ${input.parent_id}`);
		}

		const saved = await Folder.save({
			title: input.title,
			parent_id: input.parent_id ?? '',
		}, { userSideValidation: true });

		return { id: saved.id, title: saved.title, parent_id: saved.parent_id || null };
	},
};

export default tool;
