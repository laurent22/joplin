import { EditorSelection } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';

const sortSelectedLines: Command = (editor: EditorView) => {
	const state = editor.state;
	const doc = state.doc;

	const transaction = state.changeByRange(range => {
		const startLine = doc.lineAt(range.from);
		const endLine = doc.lineAt(range.to);

		const lines = [];
		for (let j = startLine.number; j <= endLine.number; j++) {
			lines.push(doc.line(j).text);
		}

		const sortedText = lines.sort().join('\n');

		return {
			range: EditorSelection.cursor(startLine.from + sortedText.length),
			changes: [{
				from: startLine.from,
				to: endLine.to,
				insert: sortedText,
			}],
		};
	});

	editor.dispatch(transaction);
	return true;
};
export default sortSelectedLines;
