import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import eventManager from '@joplin/lib/eventManager';

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
				const newNote = await Note.save(Note.toggleIsTodo(note), { userSideValidation: true });
				const eventNote = {
					id: newNote.id,
					is_todo: newNote.is_todo,
					todo_due: newNote.todo_due,
					todo_completed: newNote.todo_completed,
				};
				eventManager.emit('noteTypeToggle', { noteId: note.id, note: eventNote });
			}
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
