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
		execute: async (context: CommandContext, folderId: string = null) => {
			if (folderId === null) folderId = context.state.selectedFolderId;

			const folder = await Folder.load(folderId);
			if (!folder) throw new Error(`No such folder: ${folderId}`);
			await restoreItems(ModelType.Folder, [folder]);
		},
		enabledCondition: 'folderIsDeleted',
	};
};
