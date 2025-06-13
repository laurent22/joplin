import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { Mode } from '../../../plugins/GotoAnything';
import { GotoAnythingOptions, UiType } from './gotoAnything';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';
import markdownUtils from '@joplin/lib/markdownUtils';

const logger = Logger.create('linkToNote');

export const declaration: CommandDeclaration = {
	name: 'linkToNote',
	label: () => _('Link to note...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			const options: GotoAnythingOptions = {
				mode: Mode.TitleOnly,
			};
			const result = await CommandService.instance().execute('gotoAnything', UiType.ControlledApi, options);
			if (!result) return result;

			if (result.type !== ModelType.Note) {
				logger.warn('Retrieved item is not a note:', result);
				return null;
			}

			const link = `[${markdownUtils.escapeTitleText(result.item.title)}](:/${markdownUtils.escapeLinkUrl(result.item.id)})`;
			await CommandService.instance().execute('insertText', link);
			return result;
		},

		enabledCondition: 'markdownEditorPaneVisible || richTextEditorVisible',
	};
};
