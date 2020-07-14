import { CommandRuntime, CommandDeclaration } from '../lib/services/CommandService';
const { _ } = require('lib/locale');
const Note = require('lib/models/Note');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');
const { bridge } = require('electron').remote.require('./bridge');

interface Props {
	noteId: string
}

export const declaration:CommandDeclaration = {
	name: 'startExternalEditing',
	label: () => _('Edit in external editor'),
	iconName: 'fa-share-square',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			try {
				const note = await Note.load(props.noteId);
				ExternalEditWatcher.instance().openAndWatch(note);
			} catch (error) {
				bridge().showErrorMessageBox(_('Error opening note in editor: %s', error.message));
			}

			// await comp.saveNoteAndWait(comp.formNote);
		},
		isEnabled: (props:any) => {
			return !!props.noteId;
		},
		mapStateToProps: (state:any) => {
			return { noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null };
		},
	};
};
