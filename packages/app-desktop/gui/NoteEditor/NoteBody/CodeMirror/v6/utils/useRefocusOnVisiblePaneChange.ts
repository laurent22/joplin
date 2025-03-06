import { RefObject, useRef, useEffect } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import { NoteViewerControl } from '../../../../../NoteTextViewer';

interface Props {
	editorRef: RefObject<CodeMirrorControl>;
	webviewRef: RefObject<NoteViewerControl>;
	visiblePanes: string[];
}

const useRefocusOnVisiblePaneChange = ({ editorRef, webviewRef, visiblePanes }: Props) => {
	const lastVisiblePanes = useRef(visiblePanes);
	useEffect(() => {
		const cm6Dom = editorRef.current?.cm6?.dom;
		const doc = cm6Dom?.getRootNode() as Document|null;
		const editorHasFocus = cm6Dom?.contains(doc?.activeElement);
		const viewerHasFocus = webviewRef.current?.hasFocus();

		const lastHadViewer = lastVisiblePanes.current.includes('viewer');
		const hasViewer = visiblePanes.includes('viewer');
		const lastHadEditor = lastVisiblePanes.current.includes('editor');
		const hasEditor = visiblePanes.includes('editor');

		const viewerJustHidden = lastHadViewer && !hasViewer;
		if (viewerJustHidden && viewerHasFocus) {
			focus('CodeMirror/refocusEditor1', editorRef.current);
		}

		// Jump focus to the editor just after showing it -- this assumes that the user
		// shows the editor to start editing the note.
		const editorJustShown = !lastHadEditor && hasEditor;
		if (editorJustShown && viewerHasFocus) {
			focus('CodeMirror/refocusEditor2', editorRef.current);
		}

		const editorJustHidden = lastHadEditor && !hasEditor;
		if (editorJustHidden && editorHasFocus) {
			focus('CodeMirror/refocusViewer', webviewRef.current);
		}

		lastVisiblePanes.current = visiblePanes;
	}, [visiblePanes, editorRef, webviewRef]);
};

export default useRefocusOnVisiblePaneChange;
