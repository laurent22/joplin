import { useEffect, useCallback, useRef } from 'react';
import shim from '@joplin/lib/shim';

export function cursorPositionToTextOffset(cursorPos: any, body: string) {
	if (!body) return 0;

	const noteLines = body.split('\n');

	let pos = 0;
	for (let i = 0; i < noteLines.length; i++) {
		if (i > 0) pos++; // Need to add the newline that's been removed in the split() call above

		if (i === cursorPos.line) {
			pos += cursorPos.ch;
			break;
		} else {
			pos += noteLines[i].length;
		}
	}

	return pos;
}

export function usePrevious(value: any): any {
	const ref = useRef();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

export function useScrollHandler(editorRef: any, webviewRef: any, onScroll: Function) {
	const ignoreNextEditorScrollEvent_ = useRef(false);
	const scrollTimeoutId_ = useRef<any>(null);

	const scheduleOnScroll = useCallback((event: any) => {
		if (scrollTimeoutId_.current) {
			shim.clearTimeout(scrollTimeoutId_.current);
			scrollTimeoutId_.current = null;
		}

		scrollTimeoutId_.current = shim.setTimeout(() => {
			scrollTimeoutId_.current = null;
			onScroll(event);
		}, 10);
	}, [onScroll]);

	const setEditorPercentScroll = useCallback((p: number) => {
		ignoreNextEditorScrollEvent_.current = true;

		if (editorRef.current) {
			editorRef.current.setScrollPercent(p);

			scheduleOnScroll({ percent: p });
		}
	}, [scheduleOnScroll]);

	const setViewerPercentScroll = useCallback((p: number) => {
		if (webviewRef.current) {
			webviewRef.current.wrappedInstance.send('setPercentScroll', p);
			scheduleOnScroll({ percent: p });
		}
	}, [scheduleOnScroll]);

	const editor_scroll = useCallback(() => {
		if (ignoreNextEditorScrollEvent_.current) {
			ignoreNextEditorScrollEvent_.current = false;
			return;
		}

		if (editorRef.current) {
			const percent = editorRef.current.getScrollPercent();
			if (!isNaN(percent)) {
				// when switching to another note, the percent can sometimes be NaN
				// this is coming from `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollUtils.ts`
				// when CodeMirror returns scroll info with heigth == clientHeigth
				// https://github.com/laurent22/joplin/issues/4797
				setViewerPercentScroll(percent);
			}
		}
	}, [setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		if (editorRef.current) {
			editorRef.current.setScrollPercent(0);
		}
	}, []);

	return { resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll };
}

