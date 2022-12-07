import { ensureSyntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

// Forces a full parse of a CodeMirror editor. This is intended for unit testing.
// If not in a unit-test consider using ensureSyntaxTree or forceParsing.
// This will throw if no language is configured for the editor.
const forceFullParse = (editorState: EditorState) => {
	const timeout = 3000; // ms
	ensureSyntaxTree(editorState, editorState.doc.length, timeout);

	if (!syntaxTreeAvailable(editorState)) {
		throw new Error(
			`Unable to generate a syntax tree in ${timeout}. Is the editor configured to parse a language?`
		);
	}
};

export default forceFullParse;
