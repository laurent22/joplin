import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import RevisionService from '@joplin/lib/services/RevisionService';
import shim, { MessageBoxType } from '@joplin/lib/shim';

export const declaration: CommandDeclaration = {
	name: 'restoreNoteRevision',
	label: 'Restore a note from history',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, noteId: string, reverseRevIndex = 0) => {
			try {
				const note = await RevisionService.instance().restoreNoteById(noteId, reverseRevIndex);
				await shim.showMessageBox(RevisionService.instance().restoreSuccessMessage(note), { type: MessageBoxType.Info });
			} catch (error) {
				await shim.showErrorDialog(error.message);
			}
		},
	};
};
