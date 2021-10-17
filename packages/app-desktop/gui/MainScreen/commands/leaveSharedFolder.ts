import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import ShareService from '@joplin/lib/services/share/ShareService';

export const declaration: CommandDeclaration = {
	name: 'leaveSharedFolder',
	label: () => _('Leave notebook...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, folderId: string = null) => {
			const answer = confirm(_('This will remove the notebook from your collection and you will no longer have access to its content. Do you wish to continue?'));
			if (!answer) return;
			await ShareService.instance().leaveSharedFolder(folderId);
		},
		enabledCondition: 'joplinServerConnected && folderIsShareRootAndNotOwnedByUser',
	};
};
