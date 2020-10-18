import { CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'toggleVisiblePanes',
	label: () => _('Toggle editor layout'),
	iconName: 'icon-layout ',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.props.dispatch({
				type: 'NOTE_VISIBLE_PANES_TOGGLE',
			});
		},

		enabledCondition: 'markdownEditorVisible && oneNoteSelected',
	};
};
