import { useContext, useMemo } from 'react';
import { WindowIdContext } from '../../NewWindowOrIFrame';
import NotePositionService from '@joplin/lib/services/NotePositionService';

interface Props {
	noteId: string;
}

const useInitialCursorLocation = ({ noteId }: Props) => {
	const windowId = useContext(WindowIdContext);

	return useMemo(() => {
		return NotePositionService.instance().getCursorPosition(noteId, windowId);
	}, [noteId, windowId]);
};

export default useInitialCursorLocation;
