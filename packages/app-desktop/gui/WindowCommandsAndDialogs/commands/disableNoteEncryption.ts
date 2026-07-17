import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
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

			// The menu item is disabled while the session is locked, but the command can still be
			// invoked directly.
			if (!NoteLockSession.instance().isUnlocked()) throw new Error('Cannot disable encryption while the note lock session is locked');

			try {
				await disableNoteLock(noteId);
			} catch (error) {
				// WebCrypto reports a wrong-key decrypt as a generic OperationError.
				if (error.name === 'OperationError') throw new Error(_('Could not disable encryption because the note could not be decrypted. If it was encrypted prior to a password reset, the contents are no longer recoverable.'));
				throw error;
			}
		},
		enabledCondition: 'oneNoteSelected && noteIsLocked && noteLockSessionUnlocked && !noteIsReadOnly && !noteIsDeleted && !inTrash && !inConflictFolder',
	};
};
