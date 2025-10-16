import { useEffect, useRef, RefObject } from 'react';
import { OnMessage } from '../../../../utils/types';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';

interface Props {
	content: string;

	visiblePanes: string[];
	onMessage: OnMessage;
	editorRef: RefObject<CodeMirrorControl>;
	noteId: string;
}

// Updates the editor's value as necessary
const useSyncEditorValue = ({ content, visiblePanes, onMessage, editorRef, noteId }: Props) => {
	const visiblePanesRef = useRef(visiblePanes);
	visiblePanesRef.current = visiblePanes;
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	useEffect(() => {
		// Include the noteId in the update props to give plugins access
		// to the current note ID.
		const updateProps = { noteId: noteId };
		if (editorRef.current?.updateBody(content, updateProps)) {
			editorRef.current?.clearHistory();

			// If the viewer isn't visible, the content should be considered rendered
			// after the editor has finished updating:
			if (!visiblePanesRef.current.includes('viewer')) {
				onMessageRef.current({ channel: 'noteRenderComplete' });
			}
		}
	}, [content, noteId, editorRef]);
};

export default useSyncEditorValue;
