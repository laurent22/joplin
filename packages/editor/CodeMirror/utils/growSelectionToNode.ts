import { syntaxTree } from '@codemirror/language';
import { EditorSelection, EditorState, SelectionRange } from '@codemirror/state';

// Expands and returns a copy of [sel] to the smallest container node with name in [nodeNames].
const growSelectionToNode = (
	state: EditorState, sel: SelectionRange, nodeNames: string|string[]|null,
): SelectionRange => {
	if (!nodeNames) {
		return sel;
	}

	const isAcceptableNode = (name: string): boolean => {
		if (typeof nodeNames === 'string') {
			return name === nodeNames;
		}

		for (const otherName of nodeNames) {
			if (otherName === name) {
				return true;
			}
		}

		return false;
	};

	let newFrom = null;
	let newTo = null;
	let smallestLen = Infinity;

	// Find the smallest range.
	syntaxTree(state).iterate({
		from: sel.from, to: sel.to,
		enter: node => {
			if (isAcceptableNode(node.name)) {
				if (node.to - node.from < smallestLen) {
					newFrom = node.from;
					newTo = node.to;
					smallestLen = newTo - newFrom;
				}
			}
		},
	});

	// If it's in such a node,
	if (newFrom !== null && newTo !== null) {
		return EditorSelection.range(newFrom, newTo);
	} else {
		return sel;
	}
};

export default growSelectionToNode;
