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

			setViewerPercentScroll(percent);
		}
	}, [setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		if (editorRef.current) {
			editorRef.current.setScrollPercent(0);
		}
	}, []);

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
