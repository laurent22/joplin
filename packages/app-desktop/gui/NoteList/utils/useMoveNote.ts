import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useCallback } from 'react';
import canManuallySortNotes from './canManuallySortNotes';
import { FocusNote } from './useFocusNote';
import { Dispatch } from 'redux';

const useMoveNote = (notesParentType: string, noteSortOrder: string, selectedNoteIds: string[], selectedFolderId: string, uncompletedTodosOnTop: boolean, showCompletedTodos: boolean, notes: NoteEntity[], selectedFolderInTrash: boolean, makeItemIndexVisible: (itemIndex: number)=> void, focusNote: FocusNote, dispatch: Dispatch) => {
	const moveNote = useCallback((direction: number, inc: number) => {
		if (!canManuallySortNotes(notesParentType, noteSortOrder, selectedFolderInTrash)) return;

		const noteId = selectedNoteIds[0];
		let targetNoteIndex = BaseModel.modelIndexById(notes, noteId);
		if ((direction === 1)) {
			targetNoteIndex += inc + 1;
		}
		if ((direction === -1)) {
			targetNoteIndex -= inc;
		}
		void Note.insertNotesAt(selectedFolderId, selectedNoteIds, targetNoteIndex, uncompletedTodosOnTop, showCompletedTodos);

		// The note will be moved to the target index, so we need to update the scroll amount to make it visible
		dispatch({
			type: 'NOTE_SELECT',
			id: noteId,
		});

		makeItemIndexVisible(targetNoteIndex);

		focusNote(noteId);
	}, [selectedFolderId, noteSortOrder, notes, notesParentType, selectedNoteIds, uncompletedTodosOnTop, showCompletedTodos, selectedFolderInTrash, makeItemIndexVisible, focusNote, dispatch]);

	return moveNote;
};

export default useMoveNote;
