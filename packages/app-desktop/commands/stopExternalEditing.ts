import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';

export const declaration: CommandDeclaration = {
	name: 'stopExternalEditing',
	label: () => _('Stop external editing'),
	iconName: 'fa-stop',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			void ExternalEditWatcher.instance().stopWatching(noteId);
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly',
	};
};
