import { Mark, NodeType } from 'prosemirror-model';
import { Selection } from 'prosemirror-state';

const canReplaceSelectionWith = (selection: Selection, replaceType: NodeType, marks?: Mark[]) => {
	const selectionFrom = selection.$from;
	const selectionTo = selection.$to;
	const sharedParentDepth = selectionFrom.sharedDepth(selectionTo.pos);
	const sharedParent = selectionFrom.node(sharedParentDepth);

	return sharedParent.canReplaceWith(
		selectionFrom.index(sharedParentDepth),
		selectionTo.index(sharedParentDepth),
		replaceType,
		marks,
	);
};

export default canReplaceSelectionWith;
