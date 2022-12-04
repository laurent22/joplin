import { ensureSyntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

// Forces a full parse of a CodeMirror editor. This is intended for unit testing.
// If not in a unit-test consider using ensureSyntaxTree or forceParsing.
const forceFullParse = (editorState: EditorState) => {
	while (!syntaxTreeAvailable(editorState)) {
		const timeout = 100; // ms
		ensureSyntaxTree(editorState, editorState.doc.length, timeout);
	}
};

export default forceFullParse;
