import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import { FocusNote } from '../utils/useFocusNote';
import bridge from '../../../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteList',
	label: () => _('Note list'),
	parentLabel: () => _('Focus'),
};

export const runtime = (focusNote: FocusNote): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			focusNote(noteId);

			// The sidebar is only present in the main window. If a different window
			// is active, the main window needs to be shown.
			bridge().switchToMainWindow();
		},
		enabledCondition: 'noteListHasNotes',
	};
};
