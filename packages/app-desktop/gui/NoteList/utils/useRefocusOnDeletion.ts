import { useEffect } from 'react';
import usePrevious from '@joplin/lib/hooks/usePrevious';

const useRefocusOnDeletion = (
	noteCount: number,
	selectedNoteIds: string[],
	focusedField: string,
	focusNote: (noteId: string) => void,
) => {
	const previousNoteCount = usePrevious(noteCount, 0);

	useEffect(() => {
		const noteWasRemoved = noteCount < previousNoteCount;
		if (noteWasRemoved && selectedNoteIds.length === 1 && !focusedField) {
			focusNote(selectedNoteIds[0]);
		}
	}, [noteCount, previousNoteCount, selectedNoteIds, focusedField, focusNote]);
};

export default useRefocusOnDeletion;
