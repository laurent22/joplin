import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import Note from '@joplin/lib/models/Note';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'startExternalEditing',
	label: () => _('Open in external editor'),
	iconName: 'icon-share',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			try {
				const note = await Note.load(noteId);
				// The enabled condition can be bypassed when the command is executed directly (e.g. via
				// toggleExternalEditing): the external editor would get ciphertext, or write plaintext to disk.
				if (isNoteLockEnabled() && note.is_locked) throw new Error(_('Locked notes cannot be opened in an external editor'));
				void ExternalEditWatcher.instance().openAndWatch(note);
			} catch (error) {
				bridge().showErrorMessageBox(_('Error opening note in editor: %s', error.message));
			}
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly && !noteIsLocked',
	};
};
