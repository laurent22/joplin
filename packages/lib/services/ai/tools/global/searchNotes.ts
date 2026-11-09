import SearchEngineUtils from '../../../search/SearchEngineUtils';
import { NoteEntity } from '../../../database/types';
import { _ } from '../../../../locale';
import buildTool from '../utils/buildTool';
import { ToolError } from '../types';
import { noteSections } from '../utils/noteOutline';

interface Input {
	query?: string;
	limit?: number;
}

const fields = ['id', 'title', 'parent_id', 'updated_time', 'body'];
const defaultLimit = 20;
const maxLimit = 100;
const snippetChars = 240;

const tool = buildTool({
	id: 'search_notes',
	userDescription: (input: Input) => _('Searched for: %s', input.query || _('(empty)')),
	description: [
		'Search notes. Returns a ranked list of matches with id, title, notebook id, updated_time, and a short snippet anchored on the keyword match. The snippet often answers the question without a follow-up read_note call.',
		'',
		'Results also report "section" (a path for read_note) and "section_heading" for the match. When the snippet is not enough, read that section rather than the whole note. Section "0" means the match is before the first heading, or the note has none. Both fields are absent when the query had no body keywords to locate — do not guess a section then.',
		'To read several whole results, use read_notes in one call rather than read_note per result.',
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

		const results = notes.slice(0, limit).map((n: NoteEntity) => {
			const body = n.body ?? '';
			const anchor = findAnchor(body, keywords);
			const section = matchSection(body, anchor);
			return {
				id: n.id,
				title: n.title,
				notebook_id: n.parent_id,
				updated_time: n.updated_time,
				snippet: makeSnippet(body, anchor),
				...(section ? { section: section.path, section_heading: section.heading } : {}),
			};
		});

		return { results, total: notes.length };
	},
});

// Anchors in the raw body, not a normalised copy: the offset is also used to
// find the enclosing section, and normalising shifts it.
const findAnchor = (body: string, keywords: string[]) => {
	const lower = body.toLowerCase();
	for (const kw of keywords) {
		const i = lower.indexOf(kw);
		if (i >= 0) return i;
	}
	return -1;
};

const makeSnippet = (body: string, anchor: number) => {
	if (!body.trim()) return '';

	// Window is over-wide so collapsing whitespace still leaves enough characters.
	const rawStart = anchor < 0 ? 0 : Math.max(0, anchor - Math.floor(snippetChars / 3));
	const rawEnd = anchor < 0 ? body.length : Math.min(body.length, rawStart + snippetChars * 3);
	const window = body.slice(rawStart, rawEnd).replace(/\s+/g, ' ').trim();

	const truncated = window.length > snippetChars;
	const text = truncated ? window.slice(0, snippetChars).trimEnd() : window;
	const prefix = rawStart > 0 ? '…' : '';
	const suffix = truncated || rawEnd < body.length ? '…' : '';
	return `${prefix}${text}${suffix}`;
};

// Null when there is no match to locate: a filter-only query has nothing to
// anchor on, and the section containing offset 0 is often the whole note.
const matchSection = (body: string, anchor: number) => {
	if (anchor < 0) return null;
	const sections = noteSections(body);
	// Nested sections follow their parent, so the last match is the most specific.
	let match = sections[0];
	for (const section of sections) {
		if (anchor >= section.start && anchor < section.end) match = section;
	}
	return match;
};

export default tool;
