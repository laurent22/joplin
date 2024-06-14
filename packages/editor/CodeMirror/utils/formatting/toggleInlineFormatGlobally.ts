import { EditorState, SelectionRange, TransactionSpec } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import toggleInlineSelectionFormat from './toggleInlineSelectionFormat';


// Like toggleInlineSelectionFormat, but for all selections in [state].
const toggleInlineFormatGlobally = (
	state: EditorState, spec: RegionSpec,
): TransactionSpec => {
	const changes = state.changeByRange((sel: SelectionRange) => {
		return toggleInlineSelectionFormat(state, spec, sel);
	});
	return changes;
};

export default toggleInlineFormatGlobally;
