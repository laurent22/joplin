import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showShareNoteDialog',
	label: () => _('Publish note...'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
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
