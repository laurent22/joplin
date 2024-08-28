import { useEffect, useRef, useState } from 'react';
import usePrevious from '@joplin/lib/hooks/usePrevious';

const useActiveDescendantId = (selectedFolderId: string, selectedNoteIds: string[]) => {
	const selectedNoteIdsRef = useRef(selectedNoteIds);
	selectedNoteIdsRef.current = selectedNoteIds;

	const [activeNoteId, setActiveNoteId] = useState('');
	useEffect(() => {
		setActiveNoteId(selectedNoteIdsRef.current?.[0] ?? '');
	}, [selectedFolderId]);

	const previousNoteIdsRef = useRef<string[]>();
	previousNoteIdsRef.current = usePrevious(selectedNoteIds);

	useEffect(() => {
		const previousNoteIds = previousNoteIdsRef.current ?? [];

		// Check for items added
		for (const id of selectedNoteIds) {
			if (!previousNoteIds.includes(id)) {
				setActiveNoteId(id);
				return;
			}
		}

		// Check for items removed
		for (const id of previousNoteIds) {
			if (!selectedNoteIds.includes(id)) {
				setActiveNoteId(id);
				return;
			}
		}
	}, [selectedNoteIds]);

	return { activeNoteId, setActiveNoteId };
};

export default useActiveDescendantId;
