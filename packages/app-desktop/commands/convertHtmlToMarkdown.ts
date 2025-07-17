import HtmlToMd from '@joplin/lib/HtmlToMd';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import { stateUtils } from '@joplin/lib/reducer';
import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { MarkupToHtml } from '@joplin/renderer';

export const declaration: CommandDeclaration = {
	name: 'convertHtmlToMarkdown',
	label: () => _('Convert it to Markdown'),
};

export const runtime = (): CommandRuntime => {
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		execute: async (context: any, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			const htmlToMdParser = new HtmlToMd();

			const note = await Note.load(noteId);

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

			context.dispatch({
				type: 'NOTE_IDS_CONVERTED',
				value: [note.id],
			});

		},
		enabledCondition: 'oneNoteSelected && noteIsHtml && !noteIsReadOnly',
	};
};
