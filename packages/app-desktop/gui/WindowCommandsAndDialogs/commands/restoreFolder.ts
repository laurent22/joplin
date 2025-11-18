import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import Folder from '@joplin/lib/models/Folder';
import { ModelType } from '@joplin/lib/BaseModel';

export const declaration: CommandDeclaration = {
	name: 'restoreFolder',
	label: () => _('Restore notebook'),
	iconName: 'fas fa-trash-restore',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderIds: string|string[] = null) => {
			if (folderIds === null) folderIds = context.state.selectedFolderIds;
			if (!Array.isArray(folderIds)) {
				folderIds = [folderIds];
			}

			const folders = await Folder.loadItemsByIdsOrFail(folderIds);
			await restoreItems(ModelType.Folder, folders);
		},
		enabledCondition: 'foldersAreDeleted',
	};
};
