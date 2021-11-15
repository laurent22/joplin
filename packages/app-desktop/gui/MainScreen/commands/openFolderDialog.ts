import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'openFolderDialog',
	label: () => _('Edit'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string) => {
			context.dispatch({
				type: 'DIALOG_OPEN',
				name: 'editFolder',
				isOpen: true,
				props: {
					folderId,
				},
			});
		},
	};
};
