import { RefObject, useCallback, useRef } from 'react';
import { NoteBodyEditorRef, ScrollOptions, ScrollOptionTypes } from './types';
import usePrevious from '@joplin/lib/hooks/usePrevious';
import type { NoteIdToScrollPercent } from '../../../app.reducer';
import useNowEffect from '@joplin/lib/hooks/useNowEffect';

interface Props {
	noteId: string;
	selectedNoteHash: string;
	lastEditorScrollPercents: NoteIdToScrollPercent;
	editorRef: RefObject<NoteBodyEditorRef>;
}

const useScrollWhenReadyOptions = ({ noteId, selectedNoteHash, lastEditorScrollPercents, editorRef }: Props) => {
	const scrollWhenReadyRef = useRef<ScrollOptions|null>(null);

	const previousNoteId = usePrevious(noteId);
	const lastScrollPercentsRef = useRef<NoteIdToScrollPercent>(null);
	lastScrollPercentsRef.current = lastEditorScrollPercents;

	// This needs to be a nowEffect to prevent race conditions
	useNowEffect(() => {
		if (noteId === previousNoteId) return () => {};

		if (editorRef.current) {
			editorRef.current.resetScroll();
		}

		const lastScrollPercent = lastScrollPercentsRef.current[noteId] || 0;
		scrollWhenReadyRef.current = {
			type: selectedNoteHash ? ScrollOptionTypes.Hash : ScrollOptionTypes.Percent,
			value: selectedNoteHash ? selectedNoteHash : lastScrollPercent,
		};
		return () => {};
	}, [noteId, previousNoteId, selectedNoteHash, editorRef]);

	const clearScrollWhenReady = useCallback(() => {
		scrollWhenReadyRef.current = null;
	}, []);

	return { scrollWhenReadyRef, clearScrollWhenReady };
};

export default useScrollWhenReadyOptions;
