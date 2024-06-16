import { EditorState } from '@codemirror/state';
import tabsToSpaces from './tabsToSpaces';

// Returns true iff [a] (an indentation string) is roughly equivalent to [b].
const isIndentationEquivalent = (state: EditorState, a: string, b: string): boolean => {
	// Consider sublists to be the same as their parent list if they have the same
	// label plus or minus 1 space.
	return Math.abs(tabsToSpaces(state, a).length - tabsToSpaces(state, b).length) <= 1;
};

export default isIndentationEquivalent;
