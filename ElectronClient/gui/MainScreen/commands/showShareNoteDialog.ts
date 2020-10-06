import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'showShareNoteDialog',
	label: () => _('Share note...'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteIds }:any) => {
			comp.setState({
				shareNoteDialogOptions: {
					noteIds: noteIds,
					visible: true,
				},
			});
		},
	};
};
