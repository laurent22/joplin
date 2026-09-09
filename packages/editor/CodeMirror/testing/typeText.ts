import { EditorView } from '@codemirror/view';
import { KeyInfo } from './pressReleaseKey';

const typeText = (editor: EditorView, text: string, key?: KeyInfo) => {
	const selection = editor.state.selection;
	const inputHandlers = editor.state.facet(EditorView.inputHandler);
	const isBackspace = !!key && key.key === 'Backspace' && text === '';

	let backspaceOffset = 0;
	if (isBackspace && selection.main.empty && selection.main.from > 0) {
		backspaceOffset = -1;
	}

	// See how the upstream CodeMirror tests simulate user input:
	//    https://github.com/codemirror/autocomplete/blob/fb1c899464df4d36528331412cdd316548134cb2/test/webtest-autocomplete.ts#L116
	// The important part is the userEvent: input.type.
	const defaultTransaction = editor.state.update({
		changes: [{
			from: selection.main.from + backspaceOffset,
			to: selection.main.to,
			insert: text,
		}],
		selection: { anchor: selection.main.head + text.length + backspaceOffset },
		userEvent: 'input.type',
	});

	// Allows code that uses input handlers to be tested
	for (const handler of inputHandlers) {
		if (handler(editor, selection.main.from, selection.main.to, text, () => defaultTransaction)) {
			return;
		}
	}

	editor.dispatch(defaultTransaction);
};

export default typeText;
