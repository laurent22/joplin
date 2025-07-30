import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import { stateUtils } from '@joplin/lib/reducer';
import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { MarkupToHtml } from '@joplin/renderer';
import { runtime as convertHtmlToMarkdown } from '@joplin/lib/commands/convertHtmlToMarkdown';

export const declaration: CommandDeclaration = {
	name: 'convertNoteToMarkdown',
	label: () => _('Convert note to Markdown'),
};

export const runtime = (): CommandRuntime => {
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		execute: async (context: any, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			const note = await Note.load(noteId);

			if (note === null) return;

			const markdownBody = await convertHtmlToMarkdown().execute(context, note.body);

			const newNote = await Note.duplicate(note.id);

			newNote.body = markdownBody;
			newNote.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;

			await Note.delete(note.id, { toTrash: true });

			context.dispatch({
				type: 'NOTE_HTML_TO_MARKDOWN_DONE',
				value: note.id,
			});

			context.dispatch({
				type: 'NOTE_SELECT',
				id: newNote.id,
			});

		},
		enabledCondition: 'oneNoteSelected && noteIsHtml && !noteIsReadOnly',
	};
};
