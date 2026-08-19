import { EditorState } from 'prosemirror-state';

const documentMaximumIndex = (state: EditorState) => {
	// nodeSize is documented to be the size of a node's content plus two (one for the
	// start marker and one for the end marker). The main document doesn't have start or
	// end markers, so subtract these to get the document maximum index:
	return state.doc.nodeSize - 2;
};

const clampPointToDocument = (state: EditorState, point: number) => {
	if (point < 0) return 0;

	const maximumIndex = documentMaximumIndex(state);
	if (point > maximumIndex) return maximumIndex;

	return point;
};

export default clampPointToDocument;
