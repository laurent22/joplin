import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { Decoration } from '@codemirror/view';

const hideDecoration = Decoration.replace({});

const replaceBackslashEscapes = makeInlineReplaceExtension({
	createDecoration: (node) => {
		if (node.name === 'Escape') {
			return hideDecoration;
		}
		return null;
	},
	getDecorationRange: (node) => {
		// The Escape node spans the backslash and the escaped character (e.g., "\*").
		// We only want to hide the backslash, not the escaped character.
		return [node.from, node.from + 1];
	},
});

export default replaceBackslashEscapes;
