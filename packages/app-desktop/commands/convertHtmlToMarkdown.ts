
import HtmlToMd from '@joplin/lib/HtmlToMd';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { MarkupToHtml } from '@joplin/renderer';

export const declaration: CommandDeclaration = {
	name: 'convertHtmlToMarkdown',
	label: () => _('Convert HTML Note to Markdown'),
};

export const runtime = (): CommandRuntime => {
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		execute: async (context: any, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;
			if (!noteIds.length) return;

			const htmlToMdParser = new HtmlToMd();

			const convertedNoteIds = [];

			for (const noteId of noteIds) {
				const note = await Note.load(noteId);

				if (note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) continue;

				const markdownBody = await htmlToMdParser.parse(`<div>${note.body}</div>`, {
					baseUrl: '',
					anchorNames: [],
					convertEmbeddedPdfsToLinks: true,
				});
				await Note.save({
					...note,
					id: undefined,
					body: markdownBody,
					markup_language: MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
					user_updated_time: new Date().getTime(),
				});
				await Note.delete(note.id, { toTrash: true });

				convertedNoteIds.push(note.id);
			}

			context.dispatch({
				type: 'NOTE_IDS_CONVERTED',
				value: convertedNoteIds,
			});

		},
		enabledCondition: 'someNotesSelected && !noteIsReadOnly',
	};
};
