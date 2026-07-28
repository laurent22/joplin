import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import { disableNoteLock } from '@joplin/lib/services/noteLock/setNoteLockState';
import bridge from '../../../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'disableNoteEncryption',
	label: () => _('Disable encryption'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			if (!isNoteLockEnabled()) return;
			if (noteId === null) {
				if (context.state.selectedNoteIds.length !== 1) return;
				noteId = context.state.selectedNoteIds[0];
			}

			// Same pending-save guard as enableNoteEncryption.
			if (context.state.editorNoteStatuses[noteId] === 'saving') {
				bridge().showErrorMessageBox(_('This note is currently being saved. Please try again in a moment.'));
				return;
			}

			try {
				await disableNoteLock(noteId);
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}
		},
		enabledCondition: 'oneNoteSelected && noteIsLocked && noteLockSessionUnlocked && !noteIsReadOnly && !noteIsDeleted && !inTrash && !inConflictFolder',
	};
};
