import { EditorSelection } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';

const nodeIntersectsSelection = (selection: EditorSelection, node: SyntaxNodeRef) => {
	const mainSelection = selection.main;

	const nodeContains = (point: number) => {
		return point >= node.from && point <= node.to;
	};
	const selectionContains = (point: number) => {
		return point >= mainSelection.from && point <= mainSelection.to;
	};
	return nodeContains(mainSelection.from) || nodeContains(mainSelection.to)
		|| selectionContains(node.from) || selectionContains(node.to);
};

export default nodeIntersectsSelection;
