import { CommandRuntime, CommandDeclaration } from '../lib/services/CommandService';
import { _ } from 'lib/locale';
const Note = require('lib/models/Note');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');
const bridge = require('electron').remote.require('./bridge').default;

interface Props {
	noteId: string
}

export const declaration:CommandDeclaration = {
	name: 'startExternalEditing',
	label: () => _('Edit in external editor'),
	iconName: 'icon-share',
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
		},
		isEnabled: (props:any) => {
			return !!props.noteId;
		},
		mapStateToProps: (state:any) => {
			return {
				noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
			};
		},
	};
};
