import * as React from 'react';
import { useCallback } from 'react';
import { Dispatch } from 'redux';

const useOnNoteClick = (dispatch: Dispatch) => {
	const onNoteClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const noteId = event.currentTarget.getAttribute('data-note-id');

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
	}, [dispatch]);

	return onNoteClick;
};

export default useOnNoteClick;
