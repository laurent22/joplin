import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplinapp/lib/services/CommandService';
import { _ } from '@joplinapp/lib/locale';

export const declaration:CommandDeclaration = {
	name: 'showShareNoteDialog',
	label: () => _('Share note...'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async (context:CommandContext, noteIds:string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			comp.setState({
				shareNoteDialogOptions: {
					noteIds: noteIds,
					visible: true,
				},
			});
		},
	};
};
