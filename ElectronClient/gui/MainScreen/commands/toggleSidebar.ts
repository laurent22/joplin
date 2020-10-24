import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'toggleSidebar',
	label: () => _('Toggle sidebar'),
	iconName: 'fa-bars',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.props.dispatch({
				type: 'SIDEBAR_VISIBILITY_TOGGLE',
			});
		},
		title: () => {
			return _('Toggle sidebar');
		},
	};
};
