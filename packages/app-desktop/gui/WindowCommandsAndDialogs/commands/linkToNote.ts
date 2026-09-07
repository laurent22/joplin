import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { Mode } from '../../../plugins/GotoAnything';
import { GotoAnythingOptions, UiType } from './gotoAnything';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';
import markdownUtils from '@joplin/lib/markdownUtils';
import { stateUtils } from '@joplin/lib/reducer';
import Note from '@joplin/lib/models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { htmlentities } from '@joplin/utils/html';

const logger = Logger.create('linkToNote');

export const declaration: CommandDeclaration = {
	name: 'linkToNote',
	label: () => _('Link to note...'),
	iconName: 'fas fa-file-export',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			const options: GotoAnythingOptions = {
				mode: Mode.TitleOnly,
				alwaysShowHelp: true,
			};
			const result = await CommandService.instance().execute('gotoAnything', UiType.ControlledApi, options);
			if (!result) return result;

			if (result.type !== ModelType.Note) {
				logger.warn('Retrieved item is not a note:', result);
				return null;
			}

			const noteId = context?.state?.selectedNoteIds?.length ? stateUtils.selectedNoteId(context.state) : null;
			const currentNote = noteId ? await Note.load(noteId) : null;
			const isHtml = currentNote && currentNote.markup_language === MarkupLanguage.Html;

			const link = isHtml
				? `<a href=":/${markdownUtils.escapeLinkUrl(result.item.id)}">${htmlentities(result.item.title || result.item.id)}</a>`
				: `[${markdownUtils.escapeTitleText(result.item.title)}](:/${markdownUtils.escapeLinkUrl(result.item.id)})`;

			await CommandService.instance().execute('insertText', link);
			return result;
		},

		enabledCondition: 'oneNoteSelected && (markdownEditorPaneVisible || richTextEditorVisible) && !noteIsReadOnly && !noteIsDeleted',
	};
};
