import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import ShareService from '@joplin/lib/services/share/ShareService';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('leaveSharedFolder');

export const declaration: CommandDeclaration = {
	name: 'leaveSharedFolder',
	label: () => _('Leave notebook...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, folderId: string = null) => {
			const answer = confirm(_('This will remove the notebook from your collection and you will no longer have access to its content. Do you wish to continue?'));
			if (!answer) return;

			try {
				// Since we are going to delete the notebook, do some extra safety checks. In particular:
				// - Check that the notebook is indeed being shared.
				// - Check that it does **not** belong to the current user.

				const shares = await ShareService.instance().refreshShares();
				const share = shares.find(s => s.folder_id === folderId);
				if (!share) throw new Error(_('Could not verify the share status of this notebook - aborting. Please try again when you are connected to the internet.'));

				await ShareService.instance().leaveSharedFolder(folderId, share.user.id);
			} catch (error) {
				logger.error(error);
				alert(_('Error: %s', error.message));
			}
		},
		enabledCondition: 'joplinServerConnected && folderIsShareRootAndNotOwnedByUser',
	};
};
