import { Node as ProseMirrorNode, Slice } from 'prosemirror-model';

const isListItemNode = (node: ProseMirrorNode) => (
	node.type.name === 'list_item' || node.type.name === 'task_list_item'
);

const getDraggedListItemType = (slice: Slice) => {
	if (slice.openStart !== 0 || slice.openEnd !== 0 || slice.content.childCount !== 1) {
		return null;
	}

	const draggedNode = slice.content.firstChild;
	if (!isListItemNode(draggedNode)) {
		return null;
	}

	return draggedNode.type;
};

const adjustListItemDropInsertPos = (doc: ProseMirrorNode, insertPos: number, slice: Slice): number => {
	const draggedListItemType = getDraggedListItemType(slice);
	if (!draggedListItemType) {
		return insertPos;
	}

	const $pos = doc.resolve(insertPos);

	// If dropping right before/after a compatible list, force insertion into that list.
	if ($pos.nodeAfter?.type.contentMatch.matchType(draggedListItemType)) {
		return insertPos + 1;
	}
	if ($pos.nodeBefore?.type.contentMatch.matchType(draggedListItemType)) {
		return insertPos - 1;
	}

	return insertPos;
};

export default adjustListItemDropInsertPos;
