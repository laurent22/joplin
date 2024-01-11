import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { ModelType } from '@joplin/lib/BaseModel';

export const declaration: CommandDeclaration = {
	name: 'restoreNote',
	label: () => _('Restore note'),
	iconName: 'fas fa-trash-restore',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;
			const notes: NoteEntity[] = await Note.byIds(noteIds, { fields: ['id', 'parent_id'] });
			await restoreItems(ModelType.Note, notes);
		},
		enabledCondition: 'allSelectedNotesAreDeleted',
	};
};
