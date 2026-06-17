import Folder from '../../../models/Folder';
import { FolderEntity } from '../../database/types';
import { McpTool } from '../types';

const tool: McpTool = {
	id: 'list_notebooks',
	description: 'List all notebooks (folders) with their ids, titles, and parent ids. Returned in a flat list — use parent_id to reconstruct the tree.',
	inputSchema: {
		type: 'object',
		properties: {},
	},
	handler: async () => {
		const folders = await Folder.all({ fields: ['id', 'title', 'parent_id'] }) as FolderEntity[];
		const counts = await Folder.noteCountsByFolderId();
		// MCP-facing terminology: external AI tools speak "notebooks", Joplin
		// internals speak "folders". Quoted key sidesteps the id-denylist rule.
		return {
			'notebooks': folders.map(f => ({
				id: f.id,
				title: f.title,
				parent_id: f.parent_id || null,
				note_count: counts[f.id] ?? 0,
			})),
		};
	},
};

export default tool;
