import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'toggleNoteType',
	label: () => _('Switch between note and to-do type'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;

			for (let i = 0; i < noteIds.length; i++) {
				const note = await Note.load(noteIds[i]);
				await Note.save(Note.toggleIsTodo(note), { userSideValidation: true });
			}
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
