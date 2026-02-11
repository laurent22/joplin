import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';
import { Decoration } from '@codemirror/view';
import htmlNodeInfo, { HtmlNodeInfo } from '../../utils/htmlNodeInfo';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';

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

	const hideTags = makeInlineReplaceExtension({
		createDecoration: (node, state) => {
			const info = htmlNodeInfo(node, state);
			return info && isMatchingTag(info) ? hideDecoration : null;
		},
	});

	const styleContent = makeInlineReplaceExtension({
		createDecoration: (node, state) => {
			const info = htmlNodeInfo(node, state);
			if (!info || !isMatchingOpeningTag(info)) return null;
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
