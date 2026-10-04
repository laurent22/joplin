import { _ } from '../../../../locale';
import Tag from '../../../../models/Tag';
import buildTool from '../utils/buildTool';

const tool = buildTool({
	id: 'list_tags',
	userDescription: () => _('Read all tags'),
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
});

export default tool;
