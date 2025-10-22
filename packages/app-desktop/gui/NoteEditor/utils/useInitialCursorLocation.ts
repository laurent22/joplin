import { useMemo } from 'react';
import { EditorCursorLocations, NoteIdToEditorCursorLocations } from '../../../app.reducer';

interface Props {
	lastEditorCursorLocations: NoteIdToEditorCursorLocations;
	noteId: string;
}

const useInitialCursorLocation = ({ noteId, lastEditorCursorLocations }: Props) => {
	const lastCursorLocation = lastEditorCursorLocations[noteId];

	return useMemo((): EditorCursorLocations => {
		return lastCursorLocation ?? { };
	}, [lastCursorLocation]);
};

export default useInitialCursorLocation;
