import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplinapp/lib/services/CommandService';
import { _ } from '@joplinapp/lib/locale';
import { stateUtils } from '@joplinapp/lib/reducer';
const Note = require('@joplinapp/lib/models/Note');
const ExternalEditWatcher = require('@joplinapp/lib/services/ExternalEditWatcher');
const bridge = require('electron').remote.require('./bridge').default;

export const declaration:CommandDeclaration = {
	name: 'startExternalEditing',
	label: () => _('Edit in external editor'),
	iconName: 'icon-share',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (context:CommandContext, noteId:string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			try {
				const note = await Note.load(noteId);
				ExternalEditWatcher.instance().openAndWatch(note);
			} catch (error) {
				bridge().showErrorMessageBox(_('Error opening note in editor: %s', error.message));
			}
		},
		enabledCondition: 'oneNoteSelected',
	};
};
