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
		return {
			tags: tags.map(t => ({ id: t.id, title: t.title })),
		};
	},
};

export default tool;
