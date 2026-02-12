import { Command, TextSelection } from 'prosemirror-state';

const selectDocumentEnd: Command = (state, dispatch) => {
	// nodeSize is defined to be the length of the node content plus two (one for the start
	// and one for the end token). However, the main document has no start/end tokens, so subtract two.
	const position = state.doc.nodeSize - 2;

	const endAlreadySelected = position === state.selection.from && state.selection.to === state.selection.from;
	if (endAlreadySelected) {
		return false;
	}

	const transaction = state.tr.setSelection(TextSelection.create(state.doc, position));

	if (dispatch) {
		dispatch(transaction);
	}

	return true;
};

export default selectDocumentEnd;
