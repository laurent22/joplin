import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import makeHideReplaceExtension from './utils/makeHideReplaceExtension';

const shouldFullReplace = (node: SyntaxNodeRef, state: EditorState) => {
	const getNodeStartLine = () => state.doc.lineAt(node.from);

	if (['HeaderMark', 'CodeMark', 'EmphasisMark', 'StrikethroughMark', 'HighlightMarker', 'InsertMarker'].includes(node.name)) {
		return true;
	}

	if (node.name === 'QuoteMark' && node.from === getNodeStartLine().from) {
		return true;
	}

	return false;
};

const replaceFormatCharacters = [
	makeHideReplaceExtension({
		getRevealStrategy: (node) => {
			if (node.name === 'QuoteMark') {
				return 'line';
			}
			if (node.name === 'CodeMark') {
				if (node.node.parent?.name === 'FencedCode') {
					return 'line';
				}
			}

			return 'active';
		},
		shouldHide: (node, state) => {
			return shouldFullReplace(node, state);
		},
		getSelectionOwner: (node, state) => {
			if (node.name === 'QuoteMark') return state.doc.lineAt(node.from);
			return node.node.parent;
		},
		getDecorationRange: (node, state) => {
			// Headers in the form "## Header" and blockquotes in the form "> Quote"
			// should have the marker and the space immediately after hidden
			if (node.name === 'HeaderMark' || node.name === 'QuoteMark') {
				const markerLine = state.doc.lineAt(node.from);

				// Certain header styles and empty markers (e.g. a bare ">" or "> ") DON'T have
				// content after a trailing space:
				const hasRoomForSpace = node.to + 1 >= markerLine.to;
				if (hasRoomForSpace) {
					return null;
				}

				// Include the space in the hidden region, if it's available
				if (state.doc.sliceString(node.to, node.to + 1) === ' ') {
					return [node.from, node.to + 1];
				}
			}

			return null;
		},
	}),
];

export default replaceFormatCharacters;
