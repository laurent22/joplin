import { _ } from '@joplin/lib/locale';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import { folderTreeNoteIds, promptAndBulkSetNoteLockState } from '@joplin/lib/services/noteLock/bulkSetNoteLockState';
import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import { DesktopCommandContext } from '../../../services/commands/types';
import noteLockPrompts from '../../../utils/noteLockPrompts';
import bridge from '../../../services/bridge';

export type BulkNoteLockTarget = string[]|{ folderId: string };

const setNotesLockState = async (context: DesktopCommandContext, target: BulkNoteLockTarget, isLocked: boolean) => {
	if (!isNoteLockEnabled()) return;
	const noteIds = !target ? context.state.selectedNoteIds : Array.isArray(target) ? target : await folderTreeNoteIds(target.folderId);

	// Same pending-save guard as enableNoteEncryption.
	if (noteIds.some(noteId => context.state.editorNoteStatuses[noteId] === 'saving')) {
		bridge().showErrorMessageBox(_('This note is currently being saved. Please try again in a moment.'));
		return;
	}

	// An externally edited note has a plaintext file on disk; flush and delete it before locking.
	const stopExternalEdits = async () => {
		for (const noteId of noteIds) {
			if (context.state.watchedNoteFiles.includes(noteId)) await ExternalEditWatcher.instance().stopWatching(noteId);
		}
	};
	await promptAndBulkSetNoteLockState(noteIds, isLocked, noteLockPrompts(context.dispatch), context.dispatch, isLocked ? stopExternalEdits : null);
};

export default setNotesLockState;
