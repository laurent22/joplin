import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

interface Range {
	from: number;
	to: number;
}

const intersectsAnySyntaxNodeOf = (state: EditorState, range: Range, nodeNames: string[]) => {
	let foundNode = false;

	syntaxTree(state).iterate({
		from: range.from,
		to: range.to,
		enter: node => {
			if (nodeNames.includes(node.name)) {
				foundNode = true;

				// Skip children
				return false;
			}

			// Search children if we haven't found a matching node yet.
			return !foundNode;
		},
	});

	return foundNode;
};

export default intersectsAnySyntaxNodeOf;

