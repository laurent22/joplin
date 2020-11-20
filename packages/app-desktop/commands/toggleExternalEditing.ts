import CommandService, { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import { DesktopCommandContext } from '../services/commands/types';

export const declaration: CommandDeclaration = {
	name: 'toggleExternalEditing',
	label: () => _('Toggle external editing'),
	iconName: 'icon-share',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: DesktopCommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			if (!noteId) return;

			if (context.state.watchedNoteFiles.includes(noteId)) {
				CommandService.instance().execute('stopExternalEditing', noteId);
			} else {
				CommandService.instance().execute('startExternalEditing', noteId);
			}
		},
		enabledCondition: 'oneNoteSelected',
		mapStateToTitle: (state: any) => {
			const noteId = stateUtils.selectedNoteId(state);
			return state.watchedNoteFiles.includes(noteId) ? _('Stop') : '';
		},
	};
};
