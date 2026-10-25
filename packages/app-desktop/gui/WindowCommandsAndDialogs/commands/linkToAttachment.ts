import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { Mode } from '../../../plugins/GotoAnything';
import { GotoAnythingOptions, UiType } from './gotoAnything';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';
import markdownUtils from '@joplin/lib/markdownUtils';

const logger = Logger.create('linkToAttachment');

export const declaration: CommandDeclaration = {
	name: 'linkToAttachment',
	label: () => _('Link to attachment...'),
	iconName: 'fas fa-file-import',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			const options: GotoAnythingOptions = {
				mode: Mode.AttachmentOnly,
				alwaysShowHelp: true,
			};
			const result = await CommandService.instance().execute('gotoAnything', UiType.ControlledApi, options);
			if (!result) return result;

			if (result.type !== ModelType.Resource) {
				logger.warn('Retrieved item is not an attachment:', result);
				return null;
			}

			const title = result.item.title || result.item.id;
			const link = `[${markdownUtils.escapeTitleText(title)}](:/${markdownUtils.escapeLinkUrl(result.item.id)})`;
			await CommandService.instance().execute('insertText', link);
			return result;
		},

		enabledCondition: 'oneNoteSelected && (markdownEditorPaneVisible || richTextEditorVisible) && !noteIsReadOnly && !noteIsDeleted',
	};
};
