import * as React from 'react';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import { FocusNote } from './useFocusNote';

const useOnNoteClick = (dispatch: Dispatch, focusNote: FocusNote) => {
	const onNoteClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const noteId = event.currentTarget.getAttribute('data-id');

		const targetTagName = event.target ? (event.target as any).tagName : '';

		// If we are for example on a checkbox, don't process the click since it
		// should be handled by the checkbox onChange handler.
		if (['INPUT'].includes(targetTagName)) return;

		focusNote(noteId);

		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			dispatch({
				type: 'NOTE_SELECT_TOGGLE',
				id: noteId,
			});
		} else if (event.shiftKey) {
			event.preventDefault();
			dispatch({
				type: 'NOTE_SELECT_EXTEND',
				id: noteId,
			});
		} else {
			dispatch({
				type: 'NOTE_SELECT',
				id: noteId,
			});
		}
	}, [dispatch, focusNote]);

	return onNoteClick;
};

export default useOnNoteClick;
