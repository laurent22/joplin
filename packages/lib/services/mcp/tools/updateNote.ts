import Note from '../../../models/Note';
import Folder from '../../../models/Folder';
import { NoteEntity } from '../../database/types';
import { McpTool, ToolError } from '../types';

interface ReplaceTextOp {
	find: string;
	replace: string;
}

interface Input {
	id?: string;
	title?: string;
	body?: string;
	append?: string;
	prepend?: string;
	replace_text?: ReplaceTextOp;
	notebook_id?: string;
	todo_completed?: boolean;
}

const tool: McpTool = {
	id: 'update_note',
	description: [
		'Update an existing note. Only the fields you pass are changed; omitted fields keep their current value.',
		'',
		'For body changes, prefer the partial operations over passing a full body:',
		'  append        — append text to the end of the body',
		'  prepend       — insert text at the start of the body',
		'  replace_text  — replace a single exact match of "find" with "replace" (errors if the text is missing or appears more than once)',
		'',
		'Pass "body" only for full rewrites; it overrides the partial operations.',
	].join('\n'),
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The note id to update.' },
			title: { type: 'string', description: 'New title.' },
			body: { type: 'string', description: 'Full replacement body. Use the partial ops below for small edits.' },
			append: { type: 'string', description: 'Text to append to the end of the existing body.' },
			prepend: { type: 'string', description: 'Text to insert at the start of the existing body.' },
			replace_text: {
				type: 'object',
				description: 'Find/replace a single occurrence in the existing body. Errors if "find" is missing or matches multiple times.',
				properties: {
					find: { type: 'string' },
					replace: { type: 'string' },
				},
				required: ['find', 'replace'],
			},
			notebook_id: { type: 'string', description: 'Move the note to a different notebook by passing its id.' },
			todo_completed: { type: 'boolean', description: 'For to-do notes: mark as completed (true) or open (false).' },
		},
		required: ['id'],
	},
	handler: async (input: Input) => {
		if (!input.id) throw new ToolError('Missing "id" parameter');

		const existing = await Note.load(input.id);
		if (!existing || existing.is_conflict || (existing.deleted_time && existing.deleted_time > 0)) {
			throw new ToolError(`Note not found: ${input.id}`);
		}

		if (input.notebook_id) {
			const folder = await Folder.load(input.notebook_id);
			if (!folder) throw new ToolError(`Notebook not found: ${input.notebook_id}`);
		}

		const patch: NoteEntity = { id: input.id };
		if (input.title !== undefined) patch.title = input.title;
		if (input.notebook_id !== undefined) patch.parent_id = input.notebook_id;
		if (input.todo_completed !== undefined) patch.todo_completed = input.todo_completed ? Date.now() : 0;

		let nextBody = existing.body ?? '';
		let bodyChanged = false;
		if (input.body !== undefined) {
			nextBody = input.body;
			bodyChanged = true;
		} else {
			if (input.prepend) {
				nextBody = `${input.prepend}${nextBody}`;
				bodyChanged = true;
			}
			if (input.append) {
				nextBody = `${nextBody}${input.append}`;
				bodyChanged = true;
			}
			if (input.replace_text) {
				const { find, replace } = input.replace_text;
				if (!find) throw new ToolError('"replace_text.find" must not be empty');
				const firstIdx = nextBody.indexOf(find);
				if (firstIdx < 0) throw new ToolError('replace_text: "find" string not found in body');
				if (nextBody.indexOf(find, firstIdx + 1) >= 0) {
					throw new ToolError('replace_text: "find" string appears more than once; pass more context to make it unique');
				}
				nextBody = `${nextBody.slice(0, firstIdx)}${replace ?? ''}${nextBody.slice(firstIdx + find.length)}`;
				bodyChanged = true;
			}
		}
		if (bodyChanged) patch.body = nextBody;

		const saved = await Note.save(patch);

		return { id: saved.id, updated_time: saved.updated_time };
	},
};

export default tool;
