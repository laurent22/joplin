import BaseModel from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useCallback } from 'react';
import bridge from '../../../services/bridge';

const useMoveNote = (notesParentType: string, noteSortOrder: string, selectedNoteIds: string[], selectedFolderId: string, uncompletedTodosOnTop: boolean, showCompletedTodos: boolean, notes: NoteEntity[]) => {
	const moveNote = useCallback((direction: number) => {
		const canManuallySortNotes = () => {
			if (notesParentType !== 'Folder') return false;

			if (noteSortOrder !== 'order') {
				const doIt = bridge().showConfirmMessageBox(_('To manually sort the notes, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notes by')), {
					buttons: [_('Do it now'), _('Cancel')],
				});
				if (!doIt) return false;

				Setting.setValue('notes.sortOrder.field', 'order');
				return false;
			}
			return true;
		};

		if (!canManuallySortNotes()) return;

		const noteId = selectedNoteIds[0];
		let targetNoteIndex = BaseModel.modelIndexById(notes, noteId);
		if ((direction === 1)) {
			targetNoteIndex += 2;
		}
		if ((direction === -1)) {
			targetNoteIndex -= 1;
		}
		void Note.insertNotesAt(selectedFolderId, selectedNoteIds, targetNoteIndex, uncompletedTodosOnTop, showCompletedTodos);
	}, [selectedFolderId, noteSortOrder, notes, notesParentType, selectedNoteIds, uncompletedTodosOnTop, showCompletedTodos]);

	return moveNote;
};

export default useMoveNote;
