import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import RevisionService from '@joplin/lib/services/RevisionService';

export const declaration: CommandDeclaration = {
	name: 'restoreNoteRevision',
	label: 'Restore a note from history',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, noteId: string, reverseRevIndex: number = 0) => {
			try {
				const note = await RevisionService.instance().restoreNoteById(noteId, reverseRevIndex);
				alert(RevisionService.instance().restoreSuccessMessage(note));
			} catch (error) {
				alert(error.message);
			}
		},
	};
};
