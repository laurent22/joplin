import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../../../services/bridge';
import Folder from '@joplin/lib/models/Folder';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

export const declaration: CommandDeclaration = {
	name: 'deleteFolder',
	label: () => _('Delete notebook'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = null) => {
			if (folderId === null) folderId = context.state.selectedFolderId;

			const folder = await Folder.load(folderId);
			if (!folder) throw new Error(`No such folder: ${folderId}`);

			let deleteMessage = _('Move notebook "%s" to the trash?\n\nAll notes and sub-notebooks within this notebook will also be moved to the trash.', substrWithEllipsis(folder.title, 0, 32));
			if (folderId === context.state.settings['sync.10.inboxId']) {
				deleteMessage = _('Delete the Inbox notebook?\n\nIf you delete the inbox notebook, any email that\'s recently been sent to it may be lost.');
			}

			const ok = bridge().showConfirmMessageBox(deleteMessage);
			if (!ok) return;

			await Folder.delete(folderId, { toTrash: true, sourceDescription: 'deleteFolder command' });
		},
		enabledCondition: '!folderIsReadOnly',
	};
};
