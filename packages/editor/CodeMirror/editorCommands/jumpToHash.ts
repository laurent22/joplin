import { ensureSyntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import uslug from '@joplin/fork-uslug/lib/uslug';
import { SyntaxNodeRef } from '@lezer/common';

const jumpToHash = (view: EditorView, hash: string) => {
	const state = view.state;
	const timeout = 1_000; // Maximum time to spend parsing the syntax tree
	let targetLocation: number|undefined = undefined;

	const removeQuotes = (quoted: string) => quoted.replace(/^["'](.*)["']$/, '$1');

	const makeEnterNode = (offset: number) => (node: SyntaxNodeRef) => {
		const nodeToText = (node: SyntaxNodeRef) => {
			return state.sliceDoc(node.from + offset, node.to + offset);
		};
		// Returns the attribute with the given name for [node]
		const getHtmlNodeAttr = (node: SyntaxNodeRef, attrName: string) => {
			if (node.from === node.to) return null; // Empty
			const content = node.node.resolveInner(node.from + 1);

			// Search for the "id" attribute
			const attributes = content.getChildren('Attribute');
			for (const attribute of attributes) {
				const nameNode = attribute.getChild('AttributeName');
				const valueNode = attribute.getChild('AttributeValue');

				if (nameNode && valueNode) {
					const name = nodeToText(nameNode).toLowerCase().replace(/^"(.*)"$/, '$1');
					if (name === attrName) {
						return removeQuotes(nodeToText(valueNode));
					}
				}
			}

			return null;
		};

		const found = targetLocation !== undefined;
		if (found) return false; // Skip this node

		let matches = false;
		if (node.name.startsWith('SetextHeading') || node.name.startsWith('ATXHeading')) {
			const nodeText = nodeToText(node)
				.replace(/^#+\s/, '') // Leading #s in headers
				.replace(/\n-+$/, ''); // Trailing --s in headers
			matches = hash === uslug(nodeText);
		} else if (node.name === 'HTMLTag' || node.name === 'HTMLBlock') {
			// CodeMirror adds HTML information to Markdown documents using overlays attached
			// to HTMLTag and HTMLBlock nodes.
			// Use .enter to enter the overlay and visit the HTML nodes:
			node.node.enter(node.from, 1).toTree().iterate({ enter: makeEnterNode(node.from) });
		} else if (node.name === 'OpenTag') {
			matches = getHtmlNodeAttr(node, 'id') === hash || getHtmlNodeAttr(node, 'name') === hash;
		}

		if (matches) {
			targetLocation = node.to + offset;
			return false;
		}

		const keepIterating = !matches;
		return keepIterating;
	};

	// Iterate over the entire syntax tree.
	ensureSyntaxTree(state, state.doc.length, timeout).iterate({
		enter: makeEnterNode(0),
	});

	if (targetLocation !== undefined) {
		view.dispatch({
			selection: EditorSelection.cursor(targetLocation),
			effects: [
				// Scrolls the target header/anchor to the top of the editor --
				// users are usually interested in the content just below a header
				// when clicking on a header link.
				EditorView.scrollIntoView(targetLocation, { y: 'start' }),
			],
		});
		return true;
	}
	return false;
};

export default jumpToHash;
