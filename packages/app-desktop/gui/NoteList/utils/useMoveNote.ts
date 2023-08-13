import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useCallback } from 'react';
import canManuallySortNotes from './canManuallySortNotes';

const useMoveNote = (notesParentType: string, noteSortOrder: string, selectedNoteIds: string[], selectedFolderId: string, uncompletedTodosOnTop: boolean, showCompletedTodos: boolean, notes: NoteEntity[]) => {
	const moveNote = useCallback((direction: number) => {
		if (!canManuallySortNotes(notesParentType, noteSortOrder)) return;

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
