import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { DesktopCommandContext } from '../../../services/commands/types';
import { _ } from '@joplin/lib/locale';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import { enableNoteLock } from '@joplin/lib/services/noteLock/setNoteLockState';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import bridge from '../../../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'enableNoteEncryption',
	label: () => _('Enable encryption'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: DesktopCommandContext, noteId: string = null) => {
			if (!isNoteLockEnabled()) return;
			if (noteId === null) {
				if (context.state.selectedNoteIds.length !== 1) return;
				noteId = context.state.selectedNoteIds[0];
			}

			// An open editor's pending save still has the old lock state and would fail against
			// the note once its lock state changes underneath it.
			if (context.state.editorNoteStatuses[noteId] === 'saving') {
				bridge().showErrorMessageBox(_('This note is currently being saved. Please try again in a moment.'));
				return;
			}

			if (!NoteLockKey.instance().load()) {
				const setUpNow = bridge().showConfirmMessageBox(_('Encrypting a note requires a note lock password, which has not yet been set. Set it up now?'), {
					buttons: [_('Yes'), _('No')],
				});
				if (setUpNow) {
					context.dispatch({
						type: 'NAV_GO',
						routeName: 'Config',
						props: { defaultSection: 'noteLock' },
					});
				}
				return;
			}

			// A note that is not yet encrypted has no unlock overlay, so the session unlock has to
			// happen through the dialog here.
			if (!NoteLockSession.instance().isUnlocked()) {
				context.dispatch({
					type: 'DIALOG_OPEN',
					name: 'noteLockUnlock',
					props: { successCommand: { name: 'enableNoteEncryption', args: [noteId] } },
				});
				return;
			}

			// An externally edited note has a plaintext file on disk; flush and delete it before locking.
			if (context.state.watchedNoteFiles.includes(noteId)) {
				await ExternalEditWatcher.instance().stopWatching(noteId);
			}

			try {
				await enableNoteLock(noteId);
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}
		},
		enabledCondition: 'oneNoteSelected && !noteIsLocked && !noteIsReadOnly && !noteIsDeleted && !inTrash && !inConflictFolder',
	};
};
