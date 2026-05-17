import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import referenceLinkStateField, { isReferenceLink, resolveReferenceFromLink } from '../links/referenceLinksStateField';
import { Decoration } from '@codemirror/view';

const shouldFullReplace = (node: SyntaxNodeRef, state: EditorState) => {
	const getParentName = () => node.node.parent?.name;
	const getNodeStartLine = () => state.doc.lineAt(node.from);

	if (['HeaderMark', 'CodeMark', 'EmphasisMark', 'StrikethroughMark', 'HighlightMarker', 'InsertMarker'].includes(node.name)) {
		return true;
	}

	if ((node.name === 'URL' || node.name === 'LinkMark') && getParentName() === 'Link') {
		const parent = node.node.parent!;
		const parentContent = state.sliceDoc(parent.from, parent.to);

		// If the link has no title (e.g. [](https://example.com) or [  ](...)),
		// keep the URL visible so the link doesn't disappear entirely. The
		// brackets/parens are still hidden.
		// See https://github.com/laurent22/joplin/issues/15425
		const linkMarks = parent.getChildren('LinkMark');
		const openingBracket = linkMarks.find(mark => state.sliceDoc(mark.from, mark.to) === '[');
		const firstClosingBracket = linkMarks.find(mark => state.sliceDoc(mark.from, mark.to) === ']');
		const hasEmptyTitle = !!openingBracket && !!firstClosingBracket
			&& state.sliceDoc(openingBracket.to, firstClosingBracket.from).trim() === '';
		if (hasEmptyTitle && node.name === 'URL') {
			return false;
		}

		if (node.name === 'LinkMark') {
			if (isReferenceLink(parentContent)) {
				return !!resolveReferenceFromLink(parentContent, state);
			}
		} else if (node.name === 'URL') {
			// Find all closing link marks
			const closingBracketNodes = linkMarks.filter(mark => {
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

			// For empty/whitespace-only link titles, extend the opening [ to
			// cover the whitespace through the closing ], so the whitespace
			// isn't visible (and isn't underlined as part of the link).
			// See https://github.com/laurent22/joplin/issues/15425
			if (node.name === 'LinkMark' && node.node.parent?.name === 'Link' && state.sliceDoc(node.from, node.to) === '[') {
				const parent = node.node.parent;
				const closingBracket = parent.getChildren('LinkMark').find(mark => state.sliceDoc(mark.from, mark.to) === ']');
				if (closingBracket && node.to < closingBracket.from && state.sliceDoc(node.to, closingBracket.from).trim() === '') {
					return [node.from, closingBracket.from];
				}
			}

			return null;
		},
	}),
];

export default replaceFormatCharacters;
