import { useEffect, useRef, useState } from 'react';
import usePrevious from '@joplin/lib/hooks/usePrevious';

const useActiveDescendantId = (selectedFolderId: string, selectedNoteIds: string[]) => {
	const selectedNoteIdsRef = useRef(selectedNoteIds);
	selectedNoteIdsRef.current = selectedNoteIds;

	const [focusedNoteId, setFocusedNoteId] = useState('');

	useEffect(() => {
		setFocusedNoteId(selectedNoteIdsRef.current?.[0] ?? '');
	}, [selectedFolderId]);

	const previousSelectedNoteIds = usePrevious(selectedNoteIds, []);
	let activeNoteId = focusedNoteId;

	if (!selectedNoteIds.includes(activeNoteId)) {
		// Prefer added items
		activeNoteId = selectedNoteIds.find(id => !previousSelectedNoteIds.includes(id)) ?? selectedNoteIds[0] ?? '';
	}

	useEffect(() => {
		if (focusedNoteId !== activeNoteId) {
			setFocusedNoteId(activeNoteId);
		}
	}, [focusedNoteId, activeNoteId]);

	return { activeNoteId, setActiveNoteId: setFocusedNoteId };
};

export default useActiveDescendantId;
