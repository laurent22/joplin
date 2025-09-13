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

	return null;
};

export default getUrlAtPosition;
