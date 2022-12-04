import { ensureSyntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

// Forces a full parse of a CodeMirror editor. This is intended for unit testing.
// If not in a unit-test consider using ensureSyntaxTree or forceParsing.
const forceFullParse = (editorState: EditorState) => {
	// Call ensureSyntaxTree at least once. Not doing so seems to occasionally
	// result in an outdated syntax tree being used.
	do {
		const timeout = 100; // ms
		ensureSyntaxTree(editorState, editorState.doc.length, timeout);
	}
	while (!syntaxTreeAvailable(editorState));
};

export default forceFullParse;
