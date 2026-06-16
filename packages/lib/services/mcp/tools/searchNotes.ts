import SearchEngineUtils from '../../search/SearchEngineUtils';
import { NoteEntity } from '../../database/types';
import { McpTool } from '../types';

interface Input {
	query?: string;
	limit?: number;
}

const FIELDS = ['id', 'title', 'parent_id', 'updated_time'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const tool: McpTool = {
	id: 'search_notes',
	description: [
		'Search notes. Returns a ranked list of matches with id, title, notebook id, and updated_time. Use this to find notes before reading them.',
		'',
		'The query supports plain keywords and Joplin search filters. Combine filters with spaces (AND); prefix with - to negate.',
		'',
		'Filters:',
		'  notebook:"Name"     limit to a notebook by title (quotes if the title has spaces)',
		'  tag:Name            limit to notes with this tag',
		'  title:Text          match in title only',
		'  body:Text           match in body only',
		'  any:1 word1 word2   match notes containing any of the words (default is all)',
		'  type:note|todo      filter by item type',
		'  iscompleted:0|1     for todos, filter by completion state',
		'  created:YYYYMMDD    notes created on or after that day; also supports day-N, week-N, month-N, year-N (e.g. created:day-7)',
		'  updated:YYYYMMDD    notes updated on or after that day; same shorthand as created:',
		'  due:YYYYMMDD        todo due-date filter',
		'  sourceurl:https://… match notes clipped from a URL',
		'  resource:image/png  match notes with attachments of this MIME type',
		'',
		'Examples:',
		'  meeting notes                       — keyword search across all notes',
		'  notebook:"Work" project             — keyword "project" within the Work notebook',
		'  notebook:Inbox                      — every note in the Inbox notebook',
		'  tag:idea -tag:archived              — tagged "idea" but not "archived"',
		'  type:todo iscompleted:0 due:day+7   — open todos due within a week',
	].join('\n'),
	inputSchema: {
		type: 'object',
		properties: {
			query: { type: 'string', description: 'Search query. See the tool description for the full filter syntax.' },
			limit: { type: 'integer', description: 'Maximum number of results to return.', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
		},
		required: ['query'],
	},
	handler: async (input: Input) => {
		if (!input.query || !input.query.trim()) {
			return { content: [{ type: 'text', text: 'Missing "query" parameter' }], isError: true };
		}

		const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
		const { notes } = await SearchEngineUtils.notesForQuery(input.query, false, { fields: FIELDS });
		const results = notes.slice(0, limit).map((n: NoteEntity) => ({
			id: n.id,
			title: n.title,
			notebook_id: n.parent_id,
			updated_time: n.updated_time,
		}));

		const payload = { results, total: results.length };
		return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
	},
};

export default tool;
