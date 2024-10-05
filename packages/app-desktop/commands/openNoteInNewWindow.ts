import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';

export const declaration: CommandDeclaration = {
	name: 'openNoteInNewWindow',
	label: () => _('Edit in new window'),
	iconName: 'icon-share',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			context.dispatch({ type: 'NOTE_WINDOW_OPEN', noteId });
		},
		enabledCondition: 'oneNoteSelected',
	};
};
