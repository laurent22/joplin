import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import Folder from '@joplin/lib/models/Folder';
import { getTrashFolderId } from '@joplin/lib/services/trash';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

export const declaration: CommandDeclaration = {
	name: 'deleteFolder',
	label: () => _('Delete notebook'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderIds: string|string[] = null) => {
			if (folderIds === null) {
				folderIds = context.state.selectedFolderIds;
			}
			if (!Array.isArray(folderIds)) {
				folderIds = [folderIds];
			}

			folderIds = folderIds.filter(id => id !== getTrashFolderId());
			if (folderIds.length === 0) {
				throw new Error('Nothing to do: At least one valid folder must be specified.');
			}

			const folders = await Folder.loadItemsByIdsOrFail(folderIds);

			const deleteMessage = [];
			if (folders.length === 1) {
				deleteMessage.push(_('Move notebook "%s" to the trash?\n\nAll notes and sub-notebooks within this notebook will also be moved to the trash.', substrWithEllipsis(folders[0].title, 0, 32)));
			} else {
				deleteMessage.push(_('Move %d notebooks to the trash?\n\nAll notes and sub-notebooks within these notebooks will also be moved to the trash.', folders.length));
			}

			if (folders.some(folder => folder.id === context.state.settings['sync.10.inboxId'])) {
				deleteMessage.push(_('Delete the Inbox notebook?\n\nIf you delete the inbox notebook, any email that\'s recently been sent to it may be lost.'));
			}

			const ok = bridge().showConfirmMessageBox(deleteMessage.join('\n\n'));
			if (!ok) return;

			await Folder.batchDelete(folderIds, { toTrash: true, sourceDescription: 'deleteFolder command' });
		},
		enabledCondition: '!foldersIncludeReadOnly',
	};
};
