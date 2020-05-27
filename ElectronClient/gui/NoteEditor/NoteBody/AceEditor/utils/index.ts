import { useState, useEffect, useCallback, useRef } from 'react';

export function cursorPositionToTextOffset(cursorPos: any, body: string) {
	if (!body) return 0;

	const noteLines = body.split('\n');

	let pos = 0;
	for (let i = 0; i < noteLines.length; i++) {
		if (i > 0) pos++; // Need to add the newline that's been removed in the split() call above

		if (i === cursorPos.row) {
			pos += cursorPos.column;
			break;
		} else {
			pos += noteLines[i].length;
		}
	}

	return pos;
}

export function currentTextOffset(editor: any, body: string) {
	return cursorPositionToTextOffset(editor.getCursorPosition(), body);
}

export function rangeToTextOffsets(range: any, body: string) {
	return {
		start: cursorPositionToTextOffset(range.start, body),
		end: cursorPositionToTextOffset(range.end, body),
	};
}

export function textOffsetSelection(selectionRange: any, body: string) {
	return selectionRange && body ? rangeToTextOffsets(selectionRange, body) : null;
}

export function selectedText(selectionRange: any, body: string) {
	const selection = textOffsetSelection(selectionRange, body);
	if (!selection || selection.start === selection.end) return '';

	return body.substr(selection.start, selection.end - selection.start);
}

export function selectionRange(editor:any) {
	const ranges = editor.getSelection().getAllRanges();
	return ranges && ranges.length ? ranges[0] : null;
}

export function textOffsetToCursorPosition(offset: number, body: string) {
	const lines = body.split('\n');
	let row = 0;
	let currentOffset = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (currentOffset + line.length >= offset) {
			return {
				row: row,
				column: offset - currentOffset,
			};
		}

		row++;
		currentOffset += line.length + 1;
	}

	return null;
}

function lineAtRow(body: string, row: number) {
	if (!body) return '';
	const lines = body.split('\n');
	if (row < 0 || row >= lines.length) return '';
	return lines[row];
}

export function selectionRangeCurrentLine(selectionRange: any, body: string) {
	if (!selectionRange) return '';
	return lineAtRow(body, selectionRange.start.row);
}

export function selectionRangePreviousLine(selectionRange: any, body: string) {
	if (!selectionRange) return '';
	return lineAtRow(body, selectionRange.start.row - 1);
}

export function lineLeftSpaces(line: string) {
	let output = '';
	for (let i = 0; i < line.length; i++) {
		if ([' ', '\t'].indexOf(line[i]) >= 0) {
			output += line[i];
		} else {
			break;
		}
	}
	return output;
}

export function usePrevious(value: any): any {
	const ref = useRef();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

export function useScrollHandler(editor: any, webviewRef: any, onScroll: Function) {
	const editorMaxScrollTop_ = useRef(0);
	const restoreScrollTop_ = useRef<any>(null);
	const ignoreNextEditorScrollEvent_ = useRef(false);
	const scrollTimeoutId_ = useRef<any>(null);

	// TODO: Below is not needed anymore????
	//
	// this.editorMaxScrollTop_ = 0;
	// // HACK: To go around a bug in Ace editor, we first set the scroll position to 1
	// // and then (in the renderer callback) to the value we actually need. The first
	// // operation helps clear the scroll position cache. See:
	// //
	// this.editorSetScrollTop(1);
	// this.restoreScrollTop_ = 0;

	const editorSetScrollTop = useCallback((v) => {
		if (!editor) return;
		editor.getSession().setScrollTop(v);
	}, [editor]);

	// Complicated but reliable method to get editor content height
	// https://github.com/ajaxorg/ace/issues/2046
	const onAfterEditorRender = useCallback(() => {
		const r = editor.renderer;
		editorMaxScrollTop_.current = Math.max(0, r.layerConfig.maxHeight - r.$size.scrollerHeight);

		if (restoreScrollTop_.current !== null) {
			editorSetScrollTop(restoreScrollTop_.current);
			restoreScrollTop_.current = null;
		}
	}, [editor, editorSetScrollTop]);

	const scheduleOnScroll = useCallback((event: any) => {
		if (scrollTimeoutId_.current) {
			clearTimeout(scrollTimeoutId_.current);
			scrollTimeoutId_.current = null;
		}

		scrollTimeoutId_.current = setTimeout(() => {
			scrollTimeoutId_.current = null;
			onScroll(event);
		}, 10);
	}, [onScroll]);

	const setEditorPercentScroll = useCallback((p: number) => {
		ignoreNextEditorScrollEvent_.current = true;
		editorSetScrollTop(p * editorMaxScrollTop_.current);
		scheduleOnScroll({ percent: p });
	}, [editorSetScrollTop, scheduleOnScroll]);

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

		const m = editorMaxScrollTop_.current;
		const percent = m ? editor.getSession().getScrollTop() / m : 0;

		setViewerPercentScroll(percent);
	}, [editor, setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		if (!editor) return;

		// Ace Editor caches scroll values, which makes
		// it hard to reset the scroll position, so we
		// need to use this hack.
		// https://github.com/ajaxorg/ace/issues/2195
		editor.session.$scrollTop = -1;
		editor.session.$scrollLeft = -1;
		editor.renderer.scrollTop = -1;
		editor.renderer.scrollLeft = -1;
		editor.renderer.scrollBarV.scrollTop = -1;
		editor.renderer.scrollBarH.scrollLeft = -1;
		editor.session.setScrollTop(0);
		editor.session.setScrollLeft(0);
	}, [editorSetScrollTop, editor]);

	useEffect(() => {
		if (!editor) return () => {};

		editor.renderer.on('afterRender', onAfterEditorRender);

		return () => {
			editor.renderer.off('afterRender', onAfterEditorRender);
		};
	}, [editor]);

	return { resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll };
}

export function useRootWidth(dependencies:any) {
	const { rootRef } = dependencies;

	const [rootWidth, setRootWidth] = useState(0);

	useEffect(() => {
		if (!rootRef.current) return;

		if (rootWidth !== rootRef.current.offsetWidth) setRootWidth(rootRef.current.offsetWidth);
	});

	return rootWidth;
}
