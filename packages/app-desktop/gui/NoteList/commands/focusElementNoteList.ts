import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import { itemAnchorRef } from '../NoteList';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteList',
	label: () => _('Note list'),
	parentLabel: () => _('Focus'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			if (noteId) {
				const ref = itemAnchorRef(noteId);
				if (ref) ref.focus();
			}
		},
		enabledCondition: 'noteListHasNotes',
	};
};
