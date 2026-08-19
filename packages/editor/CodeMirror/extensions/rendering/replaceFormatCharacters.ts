import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

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

const hideDecoration = Decoration.replace({});

const replaceFormatCharacters = [
	makeInlineReplaceExtension({
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
		createDecoration: (node, state) => {
			if (shouldFullReplace(node, state)) {
				return hideDecoration;
			}
			return null;
		},
		getDecorationRange: (node, state) => {
			// Headers in the form "## Header" should have the "##"s and the
			// space immediately after hidden
			if (node.name === 'HeaderMark') {
				const markerLine = state.doc.lineAt(node.from);

				// Certain header styles DON'T have a space after the header mark:
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
