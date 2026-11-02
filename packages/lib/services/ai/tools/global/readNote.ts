import { _ } from '../../../../locale';
import buildTool from '../utils/buildTool';
import { ToolError } from '../types';
import { renderOutline, resolveSection } from '../utils/noteOutline';
import loadNoteForReading from '../utils/loadNoteForReading';

interface Input {
	id?: string;
	outline?: boolean;
	section?: string;
	offset?: number;
	max_chars?: number;
}

export const defaultMaxChars = 8000;

const tool = buildTool({
	id: 'read_note',
	userDescription: (_input, output) => _('Read note: %s', output.title ?? _('(untitled)')),
	description: [
		'Read a single note by id. Returns title, markdown body, notebook name, tags, and timestamps.',
		'Use this for one note, or to read an outline, a section, or a further page of a note. To read several notes at once, such as search results, use read_notes instead of calling this repeatedly.',
		'For long notes, call with outline: true to get the heading structure, then request a single section instead of the whole body.',
		'For notes without headings, page through with offset and max_chars.',
	].join(' '),
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id (32-character hex).' },
			outline: { type: 'boolean', description: 'Return the heading structure instead of the body, as tab-separated "path chars heading" lines. Cannot be used with "section".' },
			section: { type: 'string', description: 'Return only this section, addressed either by positional path from the outline ("1.2.3") or by heading text ("Flatpak"), which must match exactly one heading. The section includes its subsections.' },
			offset: { type: 'integer', description: 'Character offset into the body to start at, or into the section when "section" is set. Defaults to 0.', minimum: 0 },
			max_chars: { type: 'integer', description: `Maximum characters of body to return. Defaults to ${defaultMaxChars}. Set to 0 for no limit.`, minimum: 0 },
		},
		required: ['id'],
	},
	handler: async (input: Input) => {
		if (!input.id) throw new ToolError('Missing "id" parameter');
		if (input.outline && input.section) throw new ToolError('"outline" and "section" cannot be used together');

		const loaded = await loadNoteForReading(input.id);
		if (!loaded) throw new ToolError(`Note not found: ${input.id}`);

		const { metadata, body: fullBody } = loaded;

		// The outline is paged with the same offset / max_chars semantics as the
		// body, so both go through one slicing path below.
		let content = fullBody;
		let sectionPath: string|null = null;
		let sectionHeading: string|null = null;

		if (input.outline) {
			content = renderOutline(fullBody);
		} else if (input.section) {
			const resolution = resolveSection(fullBody, input.section);
			if (!resolution.section) throw new ToolError(resolution.error);
			content = fullBody.slice(resolution.section.start, resolution.section.end);
			sectionPath = resolution.section.path;
			sectionHeading = resolution.section.heading;
		}

		const offset = Math.max(0, input.offset ?? 0);
		const maxChars = Math.max(0, input.max_chars ?? defaultMaxChars);
		const end = maxChars > 0 ? Math.min(content.length, offset + maxChars) : content.length;
		const body = content.slice(offset, end);
		const hasMore = end < content.length;
		const truncationAdvice = input.outline ?
			`Outline truncated at ${body.length} of ${content.length} chars. Read a single section, or page through the outline with offset.` :
			`Body truncated at ${body.length} of ${content.length} chars. Call with outline: true to see the heading structure and read a single section, or page with offset.`;

		return {
			...metadata,
			body,
			body_length: content.length,
			body_offset: offset,
			body_returned_chars: body.length,
			has_more: hasMore,
			...(input.outline ? { is_outline: true } : {}),
			...(sectionPath ? { section_path: sectionPath, section_heading: sectionHeading } : {}),
			...(hasMore ? { truncation_message: truncationAdvice } : {}),
		};
	},
});

export default tool;
