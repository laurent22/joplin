import { useRef, useEffect } from 'react';

// Auto-scrolls the note list to the selected note when selection changes. Uses a pending flag
// to handle cross-folder navigation where notes may not be loaded on the first render.
const useAutoScroll = (
	selectedNoteId: string,
	selectedFolderId: string,
	targetIndex: number,
	makeItemIndexVisible: (index: number)=> void,
) => {
	const lastNoteIdRef = useRef('');
	const lastFolderIdRef = useRef('');
	const scrollPendingRef = useRef(false); // true when scroll requested but notes not yet loaded

	useEffect(() => {
		// No selection or multi-selection — reset tracking state.
		if (!selectedNoteId) {
			lastNoteIdRef.current = '';
			lastFolderIdRef.current = selectedFolderId;
			scrollPendingRef.current = false;
			return;
		}

		const isNewNote = selectedNoteId !== lastNoteIdRef.current;
		const isFolderChange = selectedFolderId !== lastFolderIdRef.current;

		if (isNewNote || isFolderChange) {
			lastNoteIdRef.current = selectedNoteId;
			lastFolderIdRef.current = selectedFolderId;
			scrollPendingRef.current = true;
		}

		// targetIndex is -1 until the new folder's notes load — re-runs automatically when they do.
		if (!scrollPendingRef.current || targetIndex === -1) return;

		// makeItemIndexVisible has its own visibility guard and is a no-op when the note is
		// already visible — this covers arrow-key and click navigation without double-scrolling.
		makeItemIndexVisible(targetIndex);
		scrollPendingRef.current = false;
	}, [selectedNoteId, selectedFolderId, targetIndex, makeItemIndexVisible]);
};

export default useAutoScroll;
