import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'showShareNoteDialog',
	label: () => _('Publish note...'),
};

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			comp.setState({
				shareNoteDialogOptions: {
					noteIds: noteIds,
					visible: true,
				},
			});
		},
		enabledCondition: 'joplinServerConnected && someNotesSelected && !noteIsDeleted',
	};
};
