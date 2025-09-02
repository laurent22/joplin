import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import referenceLinkStateField, { isReferenceLink, resolveReferenceFromLink } from '../links/referenceLinksStateField';
import { Decoration } from '@codemirror/view';

const shouldFullReplace = (node: SyntaxNodeRef, state: EditorState) => {
	const getParentName = () => node.node.parent?.name;
	const getNodeStartLine = () => state.doc.lineAt(node.from);

	if (['HeaderMark', 'CodeMark', 'EmphasisMark', 'StrikethroughMark', 'HighlightMarker'].includes(node.name)) {
		return true;
	}

	if ((node.name === 'URL' || node.name === 'LinkMark') && getParentName() === 'Link') {
		const parent = node.node.parent!;
		const parentContent = state.sliceDoc(parent.from, parent.to);
		if (node.name === 'LinkMark') {
			if (isReferenceLink(parentContent)) {
				return !!resolveReferenceFromLink(parentContent, state);
			}
		} else if (node.name === 'URL') {
			// Find all closing link marks
			const closingBracketNodes = parent.getChildren('LinkMark').filter(mark => {
				const isClosingBracket = state.sliceDoc(mark.from, mark.to) === ']';
				return isClosingBracket;
			});

			// URLs can only be hidden if after the last ].
			const lastClosingBracketIdx = closingBracketNodes.length > 0 ? closingBracketNodes[closingBracketNodes.length - 1].from : null;
			if (!lastClosingBracketIdx || node.from < lastClosingBracketIdx) {
				return false;
			}
		}
		return true;
	}

	if (node.name === 'QuoteMark' && node.from === getNodeStartLine().from) {
		return true;
	}

	return false;
};

const hideDecoration = Decoration.replace({});

const replaceFormatCharacters = [
	// Dependency
	referenceLinkStateField,

	makeInlineReplaceExtension({
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
