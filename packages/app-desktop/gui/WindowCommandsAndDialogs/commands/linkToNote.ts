import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { Mode } from '../../../plugins/GotoAnything';
import { GotoAnythingOptions, UiType } from './gotoAnything';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';
import markdownUtils from '@joplin/lib/markdownUtils';
import { stateUtils } from '@joplin/lib/reducer';
import { escapeHtml } from '@joplin/lib/string-utils';
import { MarkupLanguage } from '@joplin/renderer';

const logger = Logger.create('linkToNote');

export const noteLinkMarkup = (title: string, id: string, markupLanguage: number) => {
	const escapedLinkUrl = markdownUtils.escapeLinkUrl(id);
	if (markupLanguage === MarkupLanguage.Html) return `<a href=":/${escapedLinkUrl}">${escapeHtml(title)}</a>`;
	return `[${markdownUtils.escapeTitleText(title)}](:/${escapedLinkUrl})`;
};

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

			const selectedNote = stateUtils.selectedNote(context.state);
			const link = noteLinkMarkup(result.item.title, result.item.id, selectedNote?.markup_language ?? MarkupLanguage.Markdown);
			await CommandService.instance().execute('insertText', link);
			return result;
		},

		enabledCondition: 'oneNoteSelected && (markdownEditorPaneVisible || richTextEditorVisible) && !noteIsReadOnly && !noteIsDeleted',
	};
};
