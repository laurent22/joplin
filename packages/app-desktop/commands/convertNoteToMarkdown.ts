import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import { stateUtils } from '@joplin/lib/reducer';
import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { MarkupLanguage } from '@joplin/renderer';
import { runtime as convertHtmlToMarkdown } from '@joplin/lib/commands/convertHtmlToMarkdown';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'convertNoteToMarkdown',
	label: () => _('Convert note to Markdown'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			const note = await Note.load(noteId);

			if (!note) return;

			try {
				const markdownBody = await convertHtmlToMarkdown().execute(context, note.body);

				const newNote = await Note.duplicate(note.id);

				newNote.body = markdownBody;
				newNote.markup_language = MarkupLanguage.Markdown;

				await Note.save(newNote);

				await Note.delete(note.id, { toTrash: true });

				context.dispatch({
					type: 'NOTE_HTML_TO_MARKDOWN_DONE',
					value: note.id,
				});

				context.dispatch({
					type: 'NOTE_SELECT',
					id: newNote.id,
				});
			} catch (error) {
				bridge().showErrorMessageBox(_('Could not convert note to Markdown: %s', error.message));
			}


		},
		enabledCondition: 'oneNoteSelected && noteIsHtml && !noteIsReadOnly',
	};
};
