import { insertNewlineAndIndent } from '@codemirror/commands';
import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown';
import { EditorSelection, SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const insertLineAfter = (view: EditorView) => {
	const state = view.state;
	view.dispatch(state.changeByRange((sel: SelectionRange) => {
		const line = state.doc.lineAt(sel.anchor);
		return {
			range: EditorSelection.cursor(line.to),
		};
	}));

	// insertNewlineContinueMarkup does nothing if not in markdown -- we thus
	// need a fallback case
	const addedNewLine = insertNewlineContinueMarkup(view);
	if (!addedNewLine) {
		insertNewlineAndIndent(view);
	}
};

export default insertLineAfter;
