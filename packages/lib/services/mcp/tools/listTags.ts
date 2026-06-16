import Tag from '../../../models/Tag';
import { McpTool } from '../types';

const tool: McpTool = {
	id: 'list_tags',
	description: 'List all tags that have at least one note attached, with their ids and titles.',
	inputSchema: {
		type: 'object',
		properties: {},
	},
	handler: async () => {
		const tags = await Tag.allWithNotes();
		const payload = {
			tags: tags.map(t => ({ id: t.id, title: t.title })),
		};
		return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
	},
};

export default tool;
