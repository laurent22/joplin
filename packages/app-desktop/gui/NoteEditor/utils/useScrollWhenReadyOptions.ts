import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { NoteBodyEditorRef, ScrollOptions, ScrollOptionTypes } from './types';
import usePrevious from '@joplin/lib/hooks/usePrevious';
import ResourceEditWatcher from '@joplin/lib/services/ResourceEditWatcher';
import type { EditorScrollPercents } from '../../../app.reducer';

interface Props {
	noteId: string;
	selectedNoteHash: string;
	lastEditorScrollPercents: EditorScrollPercents;
	editorRef: RefObject<NoteBodyEditorRef>;
}

const useScrollWhenReadyOptions = ({ noteId, selectedNoteHash, lastEditorScrollPercents, editorRef }: Props) => {
	const [scrollWhenReady, setScrollWhenReady] = useState<ScrollOptions|null>(null);

	const previousNoteId = usePrevious(noteId);
	const lastScrollPercentsRef = useRef<EditorScrollPercents>();
	lastScrollPercentsRef.current = lastEditorScrollPercents;

	useEffect(() => {
		if (noteId === previousNoteId) return;

		if (editorRef.current) {
			editorRef.current.resetScroll();
		}

		const lastScrollPercent = lastScrollPercentsRef.current[noteId] || 0;
		setScrollWhenReady({
			type: selectedNoteHash ? ScrollOptionTypes.Hash : ScrollOptionTypes.Percent,
			value: selectedNoteHash ? selectedNoteHash : lastScrollPercent,
		});

		void ResourceEditWatcher.instance().stopWatchingAll();
	}, [noteId, previousNoteId, selectedNoteHash, editorRef]);

	const clearScrollWhenReady = useCallback(() => {
		setScrollWhenReady(null);
	}, []);

	return { scrollWhenReady, clearScrollWhenReady };
};

export default useScrollWhenReadyOptions;
