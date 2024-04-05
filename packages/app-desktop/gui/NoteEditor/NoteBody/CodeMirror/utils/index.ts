import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function usePrevious(value: any): any {
	const ref = useRef();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}
