import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';

export const declaration: CommandDeclaration = {
	name: 'leaveSharedFolder',
	label: () => _('Leave notebook...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, folderId: string = null) => {
			const answer = confirm(_('This will remove the notebook from your collection and you will no longer have access to its content. Do you wish to continue?'));
			if (!answer) return;

			// In that case, we should only delete the folder but none of its
			// children. Deleting the folder tells the server that we want to
			// leave the share. The server will then proceed to delete all
			// associated user_items. So eventually all the notebook content
			// will also be deleted for the current user.
			//
			// We don't delete the children here because that would delete them
			// for the other share participants too.
			await Folder.delete(folderId, { deleteChildren: false });
		},
		enabledCondition: 'joplinServerConnected && folderIsShareRootAndNotOwnedByUser',
	};
};
