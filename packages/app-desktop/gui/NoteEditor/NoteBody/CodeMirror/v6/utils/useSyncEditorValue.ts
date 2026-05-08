import { useEffect, useRef, RefObject } from 'react';
import { OnMessage } from '../../../../utils/types';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';

interface Props {
	content: string;

	visiblePanes: string[];
	onMessage: OnMessage;
	editorRef: RefObject<CodeMirrorControl>;
	noteId: string;
	initialCursorLocationRef: RefObject<number>;
}

// Updates the editor's value as necessary
const useSyncEditorValue = ({ content, visiblePanes, onMessage, editorRef, noteId, initialCursorLocationRef }: Props) => {
	const visiblePanesRef = useRef(visiblePanes);
	visiblePanesRef.current = visiblePanes;
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	const lastNoteIdRef = useRef(noteId);

	useEffect(() => {
		// Include the noteId in the update props to give plugins access
		// to the current note ID.
		const updateProps = { noteId: noteId };
		if (editorRef.current?.updateBody(content, updateProps)) {
			editorRef.current?.clearHistory();

			// Only reset the cursor location when switching notes. If, for example,
			// the note is updated from a secondary window, the cursor location shouldn't
			// reset.
			const noteChanged = lastNoteIdRef.current !== noteId;
			if (noteChanged) {
				const cursorLocation = initialCursorLocationRef.current;
				editorRef.current?.select(cursorLocation, cursorLocation);
			}
			lastNoteIdRef.current = noteId;

			// If the viewer isn't visible, the content should be considered rendered
			// after the editor has finished updating:
			if (!visiblePanesRef.current.includes('viewer')) {
				onMessageRef.current({ channel: 'noteRenderComplete' });
			}
		}
	}, [content, noteId, editorRef, initialCursorLocationRef]);
};

export default useSyncEditorValue;
