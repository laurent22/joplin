import { EditorSelection } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';

export enum SwapLineDirection {
	Up = -1,
	Down = 1,
}

const swapLine = (direction: SwapLineDirection): Command => (editor: EditorView) => {
	const state = editor.state;
	const doc = state.doc;

	const transaction = state.changeByRange(range => {
		const currentLine = doc.lineAt(range.anchor);
		const otherLineNumber = currentLine.number + direction;

		// Out of range? No changes.
		if (otherLineNumber <= 0 || otherLineNumber > doc.lines) {
			return { range };
		}

		const otherLine = doc.line(otherLineNumber);

		let deltaPos;
		if (direction === SwapLineDirection.Down) {
			// +1: include newline
			deltaPos = otherLine.length + 1;
		} else {
			deltaPos = otherLine.from - currentLine.from;
		}

		return {
			range: EditorSelection.range(range.anchor + deltaPos, range.head + deltaPos),
			changes: [{
				from: currentLine.from,
				to: currentLine.to,
				insert: otherLine.text,
			}, {
				from: otherLine.from,
				to: otherLine.to,
				insert: currentLine.text,
			}],
		};
	});

	editor.dispatch(transaction);
	return true;
};
export default swapLine;
