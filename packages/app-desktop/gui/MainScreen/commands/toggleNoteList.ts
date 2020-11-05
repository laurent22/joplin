import { CommandDeclaration, CommandRuntime } from '@joplinapp/lib/services/CommandService';
import { _ } from '@joplinapp/lib/locale';

export const declaration:CommandDeclaration = {
	name: 'toggleNoteList',
	label: () => _('Toggle note list'),
	iconName: 'fas fa-align-justify',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.props.dispatch({
				type: 'NOTELIST_VISIBILITY_TOGGLE',
			});
		},
	};
};
