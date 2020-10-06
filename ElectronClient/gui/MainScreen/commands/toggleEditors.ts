import { CommandDeclaration, CommandRuntime } from '../../../lib/services/CommandService';
import Setting from 'lib/models/Setting';
import { stateUtils } from 'lib/reducer';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'toggleEditors',
	label: () => _('Toggle editors'),
	iconName: 'fa-columns',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:any) => {
			// A bit of a hack, but for now don't allow changing code view
			// while a note is being saved as it will cause a problem with
			// TinyMCE because it won't have time to send its content before
			// being switch to Ace Editor.
			if (props.hasNotesBeingSaved) return;
			Setting.toggle('editor.codeView');
		},
		isEnabled: (props:any):boolean => {
			return !props.hasNotesBeingSaved && props.hasOneSelectedNote;
		},
		mapStateToProps: (state:any):any => {
			return {
				hasNotesBeingSaved: stateUtils.hasNotesBeingSaved(state),
				hasOneSelectedNote: state.selectedNoteIds.length === 1,
			};
		},
	};
};
