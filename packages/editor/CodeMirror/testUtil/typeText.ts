import { EditorView } from '@codemirror/view';

const typeText = (editor: EditorView, text: string) => {
	// How CodeMirror does this in their tests:
	//    https://github.com/codemirror/autocomplete/blob/fb1c899464df4d36528331412cdd316548134cb2/test/webtest-autocomplete.ts#L116
	// The important part is the userEvent: input.type.

	const selection = editor.state.selection;
	editor.dispatch({
		changes: [{ from: selection.main.head, insert: text }],
		selection: { anchor: selection.main.head + text.length },
		userEvent: 'input.type',
	});
};

export default typeText;
