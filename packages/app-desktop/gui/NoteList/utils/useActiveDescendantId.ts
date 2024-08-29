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

		setActiveNoteId(current => {
			if (selectedNoteIds.includes(current)) {
				return current;
			} else {
				// Prefer added items
				for (const id of selectedNoteIds) {
					if (!previousNoteIds.includes(id)) {
						return id;
					}
				}

				return selectedNoteIds[0] ?? '';
			}
		});
	}, [selectedNoteIds]);

	return { activeNoteId, setActiveNoteId };
};

export default useActiveDescendantId;
