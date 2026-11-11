import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'showShareFolderDialog',
	label: () => _('Share notebook...'),
};

export const runtime = (comp: WindowControl): CommandRuntime => {
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
