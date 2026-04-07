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
	const lastNoteCountFolderRef = useRef(selectedFolderId);
	const folderChangedSinceLastNoteCountRef = useRef(false);

	// Track folder changes between noteCount snapshots
	useEffect(() => {
		if (selectedFolderId !== lastNoteCountFolderRef.current) {
			folderChangedSinceLastNoteCountRef.current = true;
		}
	}, [selectedFolderId]);

	useEffect(() => {
		const noteWasRemoved = noteCount < previousNoteCount;
		// Only refocus if folder hasn't changed since last noteCount snapshot.
		// This prevents false refocus when navigating to a folder with fewer notes.
		const folderDidNotChange = !folderChangedSinceLastNoteCountRef.current;

		if (noteWasRemoved && folderDidNotChange && selectedNoteIds.length === 1 && !focusedField) {
			focusNote(selectedNoteIds[0]);
		}

		// When noteCount changes, update snapshot and reset folder-change tracking
		if (noteCount !== previousNoteCount) {
			lastNoteCountFolderRef.current = selectedFolderId;
			folderChangedSinceLastNoteCountRef.current = false;
		}
	}, [noteCount, previousNoteCount, selectedNoteIds, focusedField, selectedFolderId, focusNote]);
};
export default useRefocusOnDeletion;
