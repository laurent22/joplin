import { useRef, useCallback, RefObject } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import { NoteEntity } from '@joplin/lib/services/database/types';

export type FocusNote = (noteId: string)=> void;
type ContainerRef = RefObject<HTMLElement>;
type OnMakeIndexVisible = (i: number)=> void;
type OnSetActiveId = (id: string)=> void;

const useFocusNote = (
	containerRef: ContainerRef, notes: NoteEntity[], makeItemIndexVisible: OnMakeIndexVisible, setActiveNoteId: OnSetActiveId,
) => {
	const notesRef = useRef(notes);
	notesRef.current = notes;

	const focusNote: FocusNote = useCallback((noteId: string) => {
		if (noteId) {
			setActiveNoteId(noteId);
		}

		// The note list container should have focus even when a note list item is visibly selected.
		// The visibly focused item is determined by activeNoteId and is communicated to accessibility
		// tools using aria- attributes
		focus('useFocusNote', containerRef.current);

		const targetIndex = notesRef.current.findIndex(note => note.id === noteId);
		if (targetIndex > -1) {
			makeItemIndexVisible(targetIndex);
		}
	}, [containerRef, makeItemIndexVisible, setActiveNoteId]);

	return focusNote;
};

export default useFocusNote;
