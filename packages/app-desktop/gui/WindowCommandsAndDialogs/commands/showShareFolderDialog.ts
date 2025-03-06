import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showShareFolderDialog',
	label: () => _('Share notebook...'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = null) => {
			folderId = folderId || context.state.selectedFolderId;

			comp.setState({
				shareFolderDialogOptions: {
					folderId,
					visible: true,
				},
			});
		},
		enabledCondition: 'joplinServerConnected && joplinCloudAccountType != 1 && (folderIsShareRootAndOwnedByUser || !folderIsShared)',
	};
};
