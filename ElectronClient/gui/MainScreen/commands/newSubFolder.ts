import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'newSubFolder',
	label: () => _('New sub-notebook'),
	iconName: 'fa-book',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (context:CommandContext, parentId:string = null) => {
			parentId = parentId || context.state.selectedFolderId;
			return CommandService.instance().execute('newFolder', parentId);
		},
	};
};
