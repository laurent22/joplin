import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import referenceLinkStateField, { isReferenceLink, resolveReferenceFromLink } from '../links/referenceLinksStateField';
import { Decoration } from '@codemirror/view';

const shouldFullReplace = (node: SyntaxNodeRef, state: EditorState) => {
	const isUrl = node.name === 'URL';
	const isLinkMark = node.name === 'LinkMark';
	if (!isUrl && !isLinkMark) return false;

	const parent = node.node.parent;
	if (parent?.name !== 'Link') return false;

	const parentContent = state.sliceDoc(parent.from, parent.to);
	if (isLinkMark && isReferenceLink(parentContent)) {
		return !!resolveReferenceFromLink(parentContent, state);
	}

	// Find all closing link marks
	const closingBracketNodes = parent.getChildren('LinkMark').filter(mark => {
		const isClosingBracket = state.sliceDoc(mark.from, mark.to) === ']';
		return isClosingBracket;
	});

	// URLs can only be hidden if after the last ].
	const lastClosingBracketIdx = closingBracketNodes.length > 0 ? closingBracketNodes[closingBracketNodes.length - 1].from : null;
	if (!lastClosingBracketIdx || isUrl && node.from < lastClosingBracketIdx) {
		return false;
	}

	const label = state.sliceDoc(
		parent.from, lastClosingBracketIdx,
	).replace(/^\[/, '');

	// Links with an empty label shouldn't be hidden
	if (label.trim() === '') {
		return false;
	}

	return true;
};

const hideDecoration = Decoration.replace({});

const replaceLinks = [
	// Dependency
	referenceLinkStateField,

	makeInlineReplaceExtension({
		getRevealStrategy: () => 'active',
		createDecoration: (node, state) => {
			if (shouldFullReplace(node, state)) {
				return hideDecoration;
			}
			return null;
		},
		getDecorationRange: (node, state) => {
			const previous = node.name === 'URL' ? node.node.prevSibling : null;
			if (previous?.name !== 'LinkMark') return null;
			if (state.sliceDoc(previous.from, previous.to) !== '(') return null;
			return [previous.to, node.to];
		},
	}),
];

export default replaceLinks;
