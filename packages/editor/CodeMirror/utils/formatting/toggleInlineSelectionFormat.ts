import { EditorSelection, SelectionRange, EditorState } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import { SelectionUpdate } from './types';
import findInlineMatch, { MatchSide } from './findInlineMatch';
import growSelectionToNode from '../growSelectionToNode';
import toggleInlineRegionSurrounded from './toggleInlineRegionSurrounded';

// Returns updated selections: For all selections in the given `EditorState`, toggles
// whether each is contained in an inline region of type [spec].
const toggleInlineSelectionFormat = (
	state: EditorState, spec: RegionSpec, sel: SelectionRange,
): SelectionUpdate => {
	const endMatchLen = findInlineMatch(state.doc, spec, sel, MatchSide.End);

	// If at the end of the region, move the
	// caret to the end.
	// E.g.
	//   **foobar|**
	//   **foobar**|
	if (sel.empty && endMatchLen > -1) {
		const newCursorPos = sel.from + endMatchLen;

		return {
			range: EditorSelection.cursor(newCursorPos),
		};
	}

	// Grow the selection to encompass the entire node.
	const newRange = growSelectionToNode(state, sel, spec.nodeName);
	return toggleInlineRegionSurrounded(state.doc, newRange, spec);
};

export default toggleInlineSelectionFormat;
