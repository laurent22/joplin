import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');
const { bridge } = require('electron').remote.require('./bridge');

export const declaration:CommandDeclaration = {
	name: 'print',
	label: () => _('Print'),
	iconName: 'fa-file',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteIds }:any) => {
			// TODO: test
			try {
				if (noteIds.length !== 1) throw new Error(_('Only one note can be printed at a time.'));
				await comp.printTo_('printer', { noteId: noteIds[0] });
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}
		},
		isEnabled: (props:any):boolean => {
			return !!props.noteIds.length;
		},
		mapStateToProps: (state:any):any => {
			return {
				noteIds: state.selectedNoteIds,
			};
		},
	};
};
