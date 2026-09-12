import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showPublishFolderDialog',
	label: () => _('Publish notebook...'),
};

interface Component {
	setState: (state: {
		publishFolderDialogOptions: {
			folderId: string;
			visible: boolean;
		};
	})=> void;
}

export const runtime = (comp: Component): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = null) => {
			folderId = folderId || context.state.selectedFolderId;

			comp.setState({
				publishFolderDialogOptions: {
					folderId,
					visible: true,
				},
			});
		},
		enabledCondition: 'joplinServerConnected && (folderIsShareRootAndOwnedByUser || !folderIsShared)',
	};
};
