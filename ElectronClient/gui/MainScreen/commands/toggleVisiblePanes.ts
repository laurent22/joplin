import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'toggleVisiblePanes',
	label: () => _('Toggle editor layout'),
	iconName: 'fa-columns',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			comp.props.dispatch({
				type: 'NOTE_VISIBLE_PANES_TOGGLE',
			});
		},
		isEnabled: (props:any):boolean => {
			return props.settingEditorCodeView && props.selectedNoteIds.length === 1;
		},
		mapStateToProps: (state:any):any => {
			return {
				selectedNoteIds: state.selectedNoteIds,
				settingEditorCodeView: state.settings['editor.codeView'],
			};
		},
	};
};
