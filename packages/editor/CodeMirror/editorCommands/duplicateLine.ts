import { EditorSelection } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';

const duplicateLine: Command = (editor: EditorView) => {
	const state = editor.state;
	const doc = state.doc;

	const transaction = state.changeByRange(range => {
		const currentLine = doc.lineAt(range.anchor);

		let text, insertPos, selectionRange;
		if (range.empty) {
			text = `\n${currentLine.text}`;
			insertPos = currentLine.to;
			selectionRange = EditorSelection.cursor(currentLine.to + text.length);
		} else {
			text = doc.slice(range.from, range.to);
			insertPos = range.to;
			selectionRange = EditorSelection.range(range.to, range.to + text.length);
		}
		return {
			range: selectionRange,
			changes: [{
				from: insertPos,
				to: insertPos,
				insert: text,
			}],
		};
	});

	editor.dispatch(transaction);
	return true;
};
export default duplicateLine;
