import { CommandDeclaration, CommandRuntime } from '@joplinapp/lib/services/CommandService';
import { _ } from '@joplinapp/lib/locale';

export const declaration:CommandDeclaration = {
	name: 'toggleSideBar',
	label: () => _('Toggle sidebar'),
	iconName: 'fas fa-bars',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.props.dispatch({
				type: 'SIDEBAR_VISIBILITY_TOGGLE',
			});
		},
	};
};
