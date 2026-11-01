import { EditorSelection, Text } from '@codemirror/state';

const clampSelectionToDocument = (selection: EditorSelection, doc: Text) => {
	const newRanges = [];

	const clampDocumentPosition = (pos: number) => Math.max(0, Math.min(pos, doc.length));

	let changed = false;
	for (const range of selection.ranges) {
		const newAnchor = clampDocumentPosition(range.anchor);
		const newHead = clampDocumentPosition(range.head);
		if (newAnchor !== range.anchor || newHead !== range.head) {
			newRanges.push(EditorSelection.range(newAnchor, newHead));
			changed = true;
		} else {
			newRanges.push(range);
		}
	}

	if (changed) {
		return EditorSelection.create(newRanges, selection.mainIndex);
	} else {
		return selection;
	}
};

export default clampSelectionToDocument;
