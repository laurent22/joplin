import SearchEngineUtils from '../../search/SearchEngineUtils';
import { NoteEntity } from '../../database/types';
import { McpTool, ToolError } from '../types';

interface Input {
	query?: string;
	limit?: number;
}

const fields = ['id', 'title', 'parent_id', 'updated_time', 'body'];
const defaultLimit = 20;
const maxLimit = 100;
const snippetChars = 240;

const tool: McpTool = {
	id: 'search_notes',
	description: [
		'Search notes. Returns a ranked list of matches with id, title, notebook id, updated_time, and a short snippet anchored on the keyword match. The snippet often answers the question without a follow-up read_note call.',
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
			limit: { type: 'integer', description: 'Maximum number of results to return.', minimum: 1, maximum: maxLimit, default: defaultLimit },
		},
		required: ['query'],
	},
	handler: async (input: Input) => {
		if (!input.query || !input.query.trim()) throw new ToolError('Missing "query" parameter');

		const limit = Math.min(Math.max(input.limit ?? defaultLimit, 1), maxLimit);
		const { notes } = await SearchEngineUtils.notesForQuery(input.query, false, { fields });

		// Pull keywords out of the query so we can anchor the snippet near a
		// match. Filters like `notebook:"X"` aren't useful for that.
		const keywords = input.query
			.split(/\s+/)
			.filter(t => t && !t.includes(':') && !t.startsWith('-'))
			.map(t => t.replace(/^["*]+|["*]+$/g, '').toLowerCase())
			.filter(Boolean);

		const results = notes.slice(0, limit).map((n: NoteEntity) => ({
			id: n.id,
			title: n.title,
			notebook_id: n.parent_id,
			updated_time: n.updated_time,
			snippet: makeSnippet(n.body ?? '', keywords),
		}));

		return { results, total: notes.length };
	},
};

const makeSnippet = (body: string, keywords: string[]) => {
	const normalised = body.replace(/\s+/g, ' ').trim();
	if (!normalised) return '';
	if (normalised.length <= snippetChars) return normalised;

	let anchor = -1;
	const lower = normalised.toLowerCase();
	for (const kw of keywords) {
		const i = lower.indexOf(kw);
		if (i >= 0) { anchor = i; break; }
	}

	if (anchor < 0) return `${normalised.slice(0, snippetChars).trimEnd()}…`;

	const start = Math.max(0, anchor - Math.floor(snippetChars / 3));
	const end = Math.min(normalised.length, start + snippetChars);
	const prefix = start > 0 ? '…' : '';
	const suffix = end < normalised.length ? '…' : '';
	return `${prefix}${normalised.slice(start, end).trim()}${suffix}`;
};

export default tool;
