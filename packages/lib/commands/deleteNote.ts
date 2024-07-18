import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { _ } from '../locale';
import Note from '../models/Note';

export const declaration: CommandDeclaration = {
	name: 'deleteNote',
	label: () => _('Delete note'),
	iconName: 'fa-times',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;
			if (!noteIds.length) return;
			await Note.batchDelete(noteIds, { toTrash: true, sourceDescription: 'deleteNote command' });

			context.dispatch({
				type: 'ITEMS_TRASHED',
				value: {
					noteIds,
					folderIds: [],
				},
			});
		},
		enabledCondition: '!noteIsReadOnly && !inTrash && someNotesSelected',
	};
};
