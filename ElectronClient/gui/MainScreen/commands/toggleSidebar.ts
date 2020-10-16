import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'toggleSidebar',
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
