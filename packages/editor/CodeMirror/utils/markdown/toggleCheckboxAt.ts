import { Command, EditorView } from '@codemirror/view';

const toggleCheckbox = (linePos: number): Command => (target: EditorView) => {
	const state = target.state;
	if (linePos >= state.doc.length) {
		// Position out of range
		return false;
	}

	const line = state.doc.lineAt(linePos);
	const checkboxMarkup = line.text.match(/\[(x|\s)\]/);
	if (!checkboxMarkup) {
		// Couldn't find the checkbox
		return false;
	}

	const isChecked = checkboxMarkup[0] === '[x]';
	const checkboxPos = checkboxMarkup.index! + line.from;

	target.dispatch({
		changes: [{ from: checkboxPos, to: checkboxPos + 3, insert: isChecked ? '[ ]' : '[x]' }],
	});
	return true;
};

export default toggleCheckbox;
