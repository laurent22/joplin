import { EditorState } from '@codemirror/state';
import { resolveReferenceFromLink } from '../referenceLinksStateField';
import { SyntaxNodeRef, Tree } from '@lezer/common';

enum MatchedUrlType {
	Footnote,
	Link,
}

type MatchedUrl = {
	type: MatchedUrlType;
	url: string;
	label?: string;
};

const urlFromInlineLinkLabelAtPosition = (pos: number, state: EditorState) => {
	const line = state.doc.lineAt(pos);
	const lineText = line.text;
	const lineOffset = pos - line.from;

	for (let i = 0; i < lineText.length; i++) {
		if (lineText[i] !== '[') {
			continue;
		}

		let labelDepth = 1;
		let labelEnd = -1;

		for (let j = i + 1; j < lineText.length; j++) {
			const char = lineText[j];
			if (char === '[') {
				labelDepth++;
			} else if (char === ']') {
				labelDepth--;
				if (labelDepth === 0) {
					labelEnd = j;
					break;
				}
			}
		}

		if (labelEnd < 0 || lineText[labelEnd + 1] !== '(') {
			continue;
		}

		let urlDepth = 1;
		let urlEnd = -1;

		for (let j = labelEnd + 2; j < lineText.length; j++) {
			const char = lineText[j];
			if (char === '(') {
				urlDepth++;
			} else if (char === ')') {
				urlDepth--;
				if (urlDepth === 0) {
					urlEnd = j;
					break;
				}
			}
		}

		if (urlEnd < 0) {
			continue;
		}

		if (lineOffset >= i && lineOffset <= labelEnd) {
			return lineText.slice(labelEnd + 2, urlEnd);
		}

		i = urlEnd;
	}

	return null;
};

const getUrlAtPosition = (pos: number, tree: Tree, state: EditorState): MatchedUrl|null => {
	const nodeText = (node: SyntaxNodeRef) => {
		return state.doc.sliceString(node.from, node.to);
	};

	let iterator = tree.resolveStack(pos);

	while (true) {
		if (iterator.node.name === 'Link') {
			const urlNode = iterator.node.getChild('URL');
			if (urlNode) {
				return { type: MatchedUrlType.Link, url: nodeText(urlNode) };
			}
			const fullLinkText = nodeText(iterator.node);
			let referenceLink: string|null = null;
			try {
				referenceLink = resolveReferenceFromLink(fullLinkText, state);
			} catch (_error) {
				referenceLink = null;
			}
			if (referenceLink) {
				const isFootnote = fullLinkText.match(/^\[\^\d+\]$/);
				if (isFootnote) {
					return { type: MatchedUrlType.Footnote, url: fullLinkText, label: referenceLink };
				} else {
					return { type: MatchedUrlType.Link, url: referenceLink };
				}
			}
		} else if (iterator.node.name === 'URL') {
			return { type: MatchedUrlType.Link, url: nodeText(iterator.node) };
		}

		if (!iterator.next) {
			break;
		} else {
			iterator = iterator.next;
		}
	}

	const fallbackInlineUrl = urlFromInlineLinkLabelAtPosition(pos, state);
	if (fallbackInlineUrl) {
		return {
			type: MatchedUrlType.Link,
			url: fallbackInlineUrl,
		};
	}

	return null;
};

export default getUrlAtPosition;
