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

const inlineLinkUrlAtPosition = (text: string, position: number): string|null => {
	for (let start = position; start >= 0; start--) {
		if (text[start] !== '[') continue;

		let depth = 0;
		let labelEnd = -1;
		for (let i = start; i < text.length; i++) {
			const char = text[i];
			if (char === '[') {
				depth++;
			} else if (char === ']') {
				depth--;
				if (depth === 0) {
					labelEnd = i;
					break;
				}
			}
		}

		if (labelEnd < 0 || text[labelEnd + 1] !== '(') continue;

		const urlStart = labelEnd + 2;
		const urlEnd = text.indexOf(')', urlStart);
		if (urlEnd < 0) continue;

		if (position < start || position > labelEnd) continue;

		return text.substring(urlStart, urlEnd);
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
			const referenceLink = resolveReferenceFromLink(fullLinkText, state);
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

	const fallbackUrl = inlineLinkUrlAtPosition(state.doc.toString(), pos);
	if (fallbackUrl) {
		return { type: MatchedUrlType.Link, url: fallbackUrl };
	}

	return null;
};

export default getUrlAtPosition;
