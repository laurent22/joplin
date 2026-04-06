import { useEffect, useRef } from 'react';
import usePrevious from '@joplin/lib/hooks/usePrevious';
const useRefocusOnDeletion = (
	noteCount: number,
	selectedNoteIds: string[],
	focusedField: string,
	selectedFolderId: string,
	focusNote: (noteId: string)=> void,
) => {
	const previousNoteCount = usePrevious(noteCount, 0);
	const lastFolderIdRef = useRef(selectedFolderId);

	useEffect(() => {
		const noteWasRemoved = noteCount < previousNoteCount;
		const folderDidNotChange = selectedFolderId === lastFolderIdRef.current;
		if (noteWasRemoved && folderDidNotChange && selectedNoteIds.length === 1 && !focusedField) {
			focusNote(selectedNoteIds[0]);
		}

		if (noteCount !== previousNoteCount) {
			lastFolderIdRef.current = selectedFolderId;
		}
	}, [noteCount, previousNoteCount, selectedNoteIds, focusedField, selectedFolderId, focusNote]);
};
export default useRefocusOnDeletion;
