import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';
import getCanBeCollapsedFolderIds from '../models/utils/getCanBeCollapsedFolderIds';

export const declaration: CommandDeclaration = {
	name: 'toggleAllFolders',
	label: () => _('Toggle all notebooks'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, collapseAll: boolean) => {
			context.dispatch({
				type: 'FOLDER_SET_COLLAPSED',
				ids: collapseAll ? getCanBeCollapsedFolderIds(context.state.folders) : [],
			});
		},
	};
};
