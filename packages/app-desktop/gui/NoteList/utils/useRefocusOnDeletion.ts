import { useEffect } from 'react';
import usePrevious from '@joplin/lib/hooks/usePrevious';
const useRefocusOnDeletion = (
	noteCount: number,
	selectedNoteIds: string[],
	focusedField: string,
	selectedFolderId: string,
	focusNote: (noteId: string)=> void,
) => {
	const previousNoteCount = usePrevious(noteCount, 0);
	const previousFolderId = usePrevious(selectedFolderId, '');
	useEffect(() => {
		const noteWasRemoved = noteCount < previousNoteCount;
		const folderDidNotChange = selectedFolderId === previousFolderId;
		if (noteWasRemoved && folderDidNotChange && selectedNoteIds.length === 1 && !focusedField) {
			focusNote(selectedNoteIds[0]);
		}
	}, [noteCount, previousNoteCount, selectedNoteIds, focusedField, selectedFolderId, previousFolderId, focusNote]);
};
export default useRefocusOnDeletion;
