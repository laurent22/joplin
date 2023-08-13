import shim from '@joplin/lib/shim';
import { useRef, useCallback, MutableRefObject } from 'react';

export type FocusNote = (noteId: string)=> void;

const useFocusNote = (itemRefs: MutableRefObject<Record<string, HTMLDivElement>>) => {
	const focusItemIID = useRef(null);

	const focusNote: FocusNote = useCallback((noteId: string) => {
		// - We need to focus the item manually otherwise focus might be lost when the
		//   list is scrolled and items within it are being rebuilt.
		// - We need to use an interval because when leaving the arrow pressed, the rendering
		//   of items might lag behind and so the ref is not yet available at this point.

		if (!itemRefs.current[noteId]) {
			if (focusItemIID.current) shim.clearInterval(focusItemIID.current);
			focusItemIID.current = shim.setInterval(() => {
				if (itemRefs.current[noteId]) {
					itemRefs.current[noteId].focus();
					shim.clearInterval(focusItemIID.current);
					focusItemIID.current = null;
				}
			}, 10);
		} else {
			if (focusItemIID.current) shim.clearInterval(focusItemIID.current);
			itemRefs.current[noteId].focus();
		}
	}, [itemRefs]);

	return focusNote;
};

export default useFocusNote;
