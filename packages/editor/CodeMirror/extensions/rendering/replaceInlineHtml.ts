import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { Decoration } from '@codemirror/view';
import htmlNodeInfo, { HtmlNodeInfo } from '../../utils/htmlNodeInfo';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorSelection, EditorState } from '@codemirror/state';

const hideDecoration = Decoration.replace({});

type OnRenderTagContent = (openingTag: HtmlNodeInfo)=> Decoration;
const createHtmlReplacementExtension = (tagName: string, onRenderContent: OnRenderTagContent) => {
	const isMatchingTag = (info: HtmlNodeInfo) => {
		return info.tagName().toLowerCase() === tagName;
	};
	const isMatchingOpeningTag = (info: HtmlNodeInfo) => {
		return isMatchingTag(info) && info.opening;
	};
	const isMatchingClosingTag = (info: HtmlNodeInfo) => {
		return isMatchingTag(info) && info.closing;
	};

	const findClosingTag = (openingTag: SyntaxNodeRef, state: EditorState) => {
		const openingTagInfo = htmlNodeInfo(openingTag, state);
		// Self-closing?
		if (openingTagInfo.closing) {
			return openingTag;
		}

		let cursor = openingTag.node.nextSibling;
		let nestedTagCounter = 1;

		// Find the matching closing tag
		for (; !!cursor && nestedTagCounter > 0; cursor = cursor.nextSibling) {
			const info = htmlNodeInfo(cursor, state);
			if (info && isMatchingOpeningTag(info)) {
				nestedTagCounter ++;
			} else if (info && isMatchingClosingTag(info)) {
				nestedTagCounter --;
			}

			if (nestedTagCounter === 0) {
				break;
			}
		}

		return cursor;
	};

	const findOpeningTag = (closingTag: SyntaxNodeRef, state: EditorState) => {
		const closingTagInfo = htmlNodeInfo(closingTag, state);
		// Self-closing?
		if (closingTagInfo.opening) {
			return closingTag;
		}

		let cursor = closingTag.node.prevSibling;
		let nestedTagCounter = 1;

		// Find the matching opening tag
		for (; !!cursor && nestedTagCounter > 0; cursor = cursor.prevSibling) {
			const info = htmlNodeInfo(cursor, state);
			if (info && isMatchingClosingTag(info)) {
				nestedTagCounter ++;
			} else if (info && isMatchingOpeningTag(info)) {
				nestedTagCounter --;
			}

			if (nestedTagCounter === 0) {
				break;
			}
		}

		return cursor;
	};

	const selectionIntersectsRange = (selection: EditorSelection, from: number, to: number) => {
		const rangeContains = (point: number) => point >= from && point <= to;
		const selectionContains = (point: number) => point >= selection.main.from && point <= selection.main.to;
		return rangeContains(selection.main.from) || rangeContains(selection.main.to)
			|| selectionContains(from) || selectionContains(to);
	};

	const getMatchingTagRange = (node: SyntaxNodeRef, state: EditorState): [number, number] | null => {
		const info = htmlNodeInfo(node, state);
		if (!info || !isMatchingTag(info)) return null;

		if (info.opening && info.closing) {
			return null;
		}

		if (info.opening) {
			const closingTag = findClosingTag(node, state);
			if (!closingTag) return null;
			return [node.from, closingTag.to];
		}

		if (info.closing) {
			const openingTag = findOpeningTag(node, state);
			if (!openingTag) return null;
			return [openingTag.from, node.to];
		}

		return null;
	};

	const selectionTouchesTag = (node: SyntaxNodeRef, state: EditorState) => {
		const range = getMatchingTagRange(node, state);
		if (!range) return false;
		return selectionIntersectsRange(state.selection, range[0], range[1]);
	};

	const hideTags = makeInlineReplaceExtension({
		getRevealStrategy: (node, state) => {
			return selectionTouchesTag(node, state);
		},
		createDecoration: (node, state) => {
			return getMatchingTagRange(node, state) ? hideDecoration : null;
		},
	});

	const styleContent = makeInlineReplaceExtension({
		getRevealStrategy: (node, state) => {
			return selectionTouchesTag(node, state);
		},
		createDecoration: (node, state) => {
			const info = htmlNodeInfo(node, state);
			if (!info || !isMatchingOpeningTag(info)) return null;
			if (!getMatchingTagRange(node, state)) return null;
			return onRenderContent(info);
		},
		getDecorationRange(node, state) {
			const closingTag = findClosingTag(node, state);

			if (closingTag) {
				return [node.to, closingTag.from];
			} else {
				return null;
			}
		},
	});

	return [hideTags, styleContent];
};


export default [
	createHtmlReplacementExtension('sub', () => Decoration.mark({ tagName: 'sub' })),
	createHtmlReplacementExtension('sup', () => Decoration.mark({ tagName: 'sup' })),
	createHtmlReplacementExtension('strike', () => Decoration.mark({ tagName: 'strike' })),
	createHtmlReplacementExtension('span', (info) => {
		const styles = info.getAttr('style') ?? '';
		const colorMatch = styles.match(/color:\s*(#?[a-z0-9A-Z]+|rgba?\([0-9, ]+\))(;|$)/);

		return Decoration.mark({
			attributes: {
				style: colorMatch ? `color: ${colorMatch[1]};` : '',
			},
		});
	}),
].flat();
