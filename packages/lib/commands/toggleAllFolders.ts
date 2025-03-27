import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';
import getCanBeCollapsedFolderIds from '../models/utils/getCanBeCollapsedFolderIds';
import Setting from '../models/Setting';

export const declaration: CommandDeclaration = {
	name: 'toggleAllFolders',
	label: () => _('Toggle all notebooks'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, collapseAll: boolean) => {
			if (!collapseAll && !Setting.value('folderHeaderIsExpanded')) {
				Setting.setValue('folderHeaderIsExpanded', true);
			}

			context.dispatch({
				type: 'FOLDER_SET_COLLAPSED',
				ids: collapseAll ? getCanBeCollapsedFolderIds(context.state.folders) : [],
			});
		},
	};
};
