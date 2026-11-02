import { _ } from '../../../../locale';
import buildTool from '../utils/buildTool';
import { ToolError } from '../types';
import loadNoteForReading from '../utils/loadNoteForReading';
import { defaultMaxChars } from './readNote';

interface Input {
	ids?: string[];
}

const maxIds = 20;

const tool = buildTool({
	id: 'read_notes',
	userDescription: (input: Input) => _('Read %d notes', input.ids?.length ?? 0),
	description: [
		`Read several notes by id in one call, for example the results of a search. Returns the same title, markdown body, notebook name, tags, and timestamps as read_note, for up to ${maxIds} notes.`,
		`The bodies share a total budget of ${defaultMaxChars} characters, so request only the notes you need.`,
		'Notes with has_more: true were truncated; use read_note on those to read an outline, a section, or the rest of the body.',
		'Ids that do not resolve are listed in not_found.',
		'For a single note, or to read a specific section, use read_note instead.',
	].join(' '),
	inputSchema: {
		type: 'object',
		properties: {
			ids: {
				type: 'array',
				items: { type: 'string' },
				description: `The note ids (32-character hex). At most ${maxIds}.`,
			},
		},
		required: ['ids'],
	},
	handler: async (input: Input) => {
		if (!input.ids?.length) throw new ToolError('Missing "ids" parameter');

		const ids = [...new Set(input.ids)];
		if (ids.length > maxIds) {
			throw new ToolError(`Too many ids: ${ids.length}. At most ${maxIds} notes can be read in one call, so pick the most relevant ones.`);
		}

		const notFound: string[] = [];
		const loadedNotes = [];
		for (const id of ids) {
			const loaded = await loadNoteForReading(id);
			if (loaded) {
				loadedNotes.push(loaded);
			} else {
				notFound.push(id);
			}
		}

		// Fair share of the budget: short notes take only what they need and
		// the remainder is spread over the longer ones, so the total stays capped.
		const budgets = new Map<string, number>();
		let remaining = defaultMaxChars;
		const byLength = [...loadedNotes].sort((a, b) => a.body.length - b.body.length);
		for (const [index, note] of byLength.entries()) {
			const share = Math.floor(remaining / (byLength.length - index));
			const budget = Math.min(note.body.length, share);
			budgets.set(note.metadata.id, budget);
			remaining -= budget;
		}

		const notes = loadedNotes.map(({ metadata, body: fullBody }) => {
			const body = fullBody.slice(0, budgets.get(metadata.id));
			return {
				...metadata,
				body,
				body_length: fullBody.length,
				body_returned_chars: body.length,
				has_more: body.length < fullBody.length,
			};
		});

		const truncatedCount = notes.filter(n => n.has_more).length;

		return {
			notes,
			not_found: notFound,
			...(truncatedCount ? { truncation_message: `${truncatedCount} note(s) truncated to fit the ${defaultMaxChars}-character budget. Use read_note on those with has_more: true to read an outline, a section, or page through the body.` } : {}),
		};
	},
});

export default tool;
