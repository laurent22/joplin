import { EditorState } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';

export interface HtmlNodeInfo {
	node: SyntaxNodeRef;
	opening: boolean;
	closing: boolean;
	from: number;
	to: number;
	tagName: ()=> string;
	getAttr: (attributeName: string)=> string;
}

type OnGetNodeContent = (node: SyntaxNodeRef)=> string;

const removeQuotes = (quoted: string) => quoted.replace(/^["'](.*)["']$/, '$1');

const getHtmlNodeAttr = (node: SyntaxNodeRef, attrName: string, getText: OnGetNodeContent) => {
	if (node.from === node.to) return null; // Empty
	const content = node.node.resolveInner(node.from + 1);

	// Search for the "id" attribute
	const attributes = content.getChildren('Attribute');
	for (const attribute of attributes) {
		const nameNode = attribute.getChild('AttributeName');
		const valueNode = attribute.getChild('AttributeValue');

		if (nameNode && valueNode) {
			const name = getText(nameNode).toLowerCase().replace(/^"(.*)"$/, '$1');
			if (name === attrName) {
				return removeQuotes(getText(valueNode));
			}
		}
	}

	return null;
};

// Utility function to access CodeMirror HTML node information, based on
// the corresponding Markdown node.
const htmlNodeInfo = (node: SyntaxNodeRef, state: EditorState, offset = 0): HtmlNodeInfo|null => {
	// Already an HTML node?
	if (node.name === 'OpenTag' || node.name === 'CloseTag' || node.name === 'SelfClosingTag') {
		const getNodeText = (childNode: SyntaxNodeRef) => state.sliceDoc(childNode.from + offset, childNode.to + offset);
		const selfClosing = node.name === 'SelfClosingTag';

		return {
			node,
			opening: node.name === 'OpenTag' || selfClosing,
			closing: node.name === 'CloseTag' || selfClosing,
			from: node.from + offset,
			to: node.to + offset,
			tagName: () => {
				const nodeText = getNodeText(node).trim();
				const tagNameMatch = nodeText.match(/^<\/?([^>\s]+)/);
				if (tagNameMatch) {
					return tagNameMatch[1];
				}
				return null;
			},
			getAttr: (name: string) => {
				return getHtmlNodeAttr(node, name, getNodeText);
			},
		};
	}

	// Convert Markdown HTML nodes to HTML nodes
	if (node.name === 'HTMLTag' || node.name === 'HTMLBlock') {
		const globalOffset = node.from + offset;
		let resolved: HtmlNodeInfo|null = null;

		// CodeMirror adds HTML information to Markdown documents using overlays attached
		// to HTMLTag and HTMLBlock nodes.
		// Use .enter to enter the overlay and visit the HTML nodes:
		node.node.enter(node.from, 1).toTree().iterate({
			enter: (subNode) => {
				resolved ??= htmlNodeInfo(subNode, state, globalOffset);
				return !resolved;
			},
		});

		return resolved;
	}

	return null;
};

export default htmlNodeInfo;
