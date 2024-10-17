import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import PerFolderSortOrderService from '../../../services/sortOrder/PerFolderSortOrderService';

export const declaration: CommandDeclaration = {
	name: 'togglePerFolderSortOrder',
	label: () => _('Toggle own sort order'),
};

export const runtime = (): CommandRuntime => {
	return {
		enabledCondition: 'oneFolderSelected',

		execute: async (_context: CommandContext, folderId?: string, own?: boolean) => {
			PerFolderSortOrderService.set(folderId, own);
		},
	};
};
