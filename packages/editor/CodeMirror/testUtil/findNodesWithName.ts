import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { SyntaxNode } from '@lezer/common';

// Returns a list of all nodes with the given name in the given editor's syntax tree.
// Attempts to create the syntax tree if it doesn't exist.
const findNodesWithName = (editor: EditorState, nodeName: string) => {
	const result: SyntaxNode[] = [];
	syntaxTree(editor).iterate({
		enter: (node) => {
			if (node.name === nodeName) {
				result.push(node.node);
			}
		},
	});

	return result;
};

export default findNodesWithName;
