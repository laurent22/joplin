import { RefObject, useCallback, useContext, useRef } from 'react';
import { NoteBodyEditorRef, ScrollOptions, ScrollOptionTypes } from './types';
import usePrevious from '@joplin/lib/hooks/usePrevious';
import NotePositionService from '@joplin/lib/services/NotePositionService';
import useNowEffect from '@joplin/lib/hooks/useNowEffect';
import { WindowIdContext } from '../../NewWindowOrIFrame';

interface Props {
	noteId: string;
	editorName: string;
	selectedNoteHash: string;
	editorRef: RefObject<NoteBodyEditorRef>;
}

const useScrollWhenReadyOptions = ({ noteId, editorName, selectedNoteHash, editorRef }: Props) => {
	const scrollWhenReadyRef = useRef<ScrollOptions|null>(null);

	const previousNoteId = usePrevious(noteId);
	const previousEditor = usePrevious(editorName);
	const windowId = useContext(WindowIdContext);


	// This needs to be a nowEffect to prevent race conditions
	useNowEffect(() => {
		const editorChanged = editorName !== previousEditor;
		const noteIdChanged = noteId !== previousNoteId;
		if (!editorChanged && !noteIdChanged) return () => {};

		const lastScrollPercent = NotePositionService.instance().getScrollPercent(noteId, windowId) || 0;
		scrollWhenReadyRef.current = {
			type: selectedNoteHash ? ScrollOptionTypes.Hash : ScrollOptionTypes.Percent,
			value: selectedNoteHash ? selectedNoteHash : lastScrollPercent,
		};

		if (editorRef.current) {
			editorRef.current.resetScroll();
		}

		return () => {};
	}, [editorName, previousEditor, noteId, previousNoteId, selectedNoteHash, editorRef, windowId]);

	const clearScrollWhenReady = useCallback(() => {
		scrollWhenReadyRef.current = null;
	}, []);

	return { scrollWhenReadyRef, clearScrollWhenReady };
};

export default useScrollWhenReadyOptions;
