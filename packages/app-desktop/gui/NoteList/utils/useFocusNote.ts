import shim from '@joplin/lib/shim';
import { useRef, useCallback, MutableRefObject, RefObject } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import { NoteEntity } from '@joplin/lib/services/database/types';

export type FocusNote = (noteId: string)=> void;
type ContainerRef = RefObject<HTMLElement>;
type ItemRefs = MutableRefObject<Record<string, HTMLDivElement>>;
type OnMakeIndexVisible = (i: number)=> void;
type OnSetActiveId = (id: string)=> void;

const useFocusNote = (
	containerRef: ContainerRef, itemRefs: ItemRefs, notes: NoteEntity[], makeItemIndexVisible: OnMakeIndexVisible, setActiveNoteId: OnSetActiveId,
) => {
	const focusItemIID = useRef(null);

	const notesRef = useRef(notes);
	notesRef.current = notes;

	const focusNote: FocusNote = useCallback((noteId: string) => {
		if (noteId) {
			setActiveNoteId(noteId);
		}

		// - We need to focus the item manually otherwise focus might be lost when the
		//   list is scrolled and items within it are being rebuilt.
		// - We need to use an interval because when leaving the arrow pressed or scrolling
		//   offscreen items into view, the rendering of items might lag behind and so the
		//   ref is not yet available at this point.

		if (!itemRefs.current[noteId]) {
			const targetIndex = notesRef.current.findIndex(note => note.id === noteId);
			if (targetIndex > -1) {
				makeItemIndexVisible(targetIndex);
			}
			// So that keyboard events can still be handled, we need to ensure that some part
			// of the note list keeps focus while the note element is loading.
			focus('useFocusNote0', containerRef.current);

			if (focusItemIID.current) {
				shim.clearInterval(focusItemIID.current);
			}

			if (noteId) {
				focusItemIID.current = shim.setInterval(() => {
					if (itemRefs.current[noteId]) {
						focus('useFocusNote1', itemRefs.current[noteId]);
						shim.clearInterval(focusItemIID.current);
						focusItemIID.current = null;
					}
				}, 10);
			}
		} else {
			if (focusItemIID.current) shim.clearInterval(focusItemIID.current);
			focus('useFocusNote2', itemRefs.current[noteId]);
		}
	}, [containerRef, itemRefs, makeItemIndexVisible, setActiveNoteId]);

	return focusNote;
};

export default useFocusNote;
