import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useCallback } from 'react';
import canManuallySortNotes from './canManuallySortNotes';

const useMoveNote = (notesParentType: string, noteSortOrder: string, selectedNoteIds: string[], selectedFolderId: string, uncompletedTodosOnTop: boolean, showCompletedTodos: boolean, notes: NoteEntity[], selectedFolderInTrash: boolean) => {
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
	}, [selectedFolderId, noteSortOrder, notes, notesParentType, selectedNoteIds, uncompletedTodosOnTop, showCompletedTodos, selectedFolderInTrash]);

	return moveNote;
};

export default useMoveNote;
