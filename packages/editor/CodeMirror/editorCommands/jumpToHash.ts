import { ensureSyntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import uslug from '@joplin/fork-uslug/lib/uslug';
import { SyntaxNodeRef } from '@lezer/common';
import htmlNodeInfo from '../utils/htmlNodeInfo';

const jumpToHash = (view: EditorView, hash: string) => {
	const state = view.state;
	const timeout = 1_000; // Maximum time to spend parsing the syntax tree
	let targetLocation: number|undefined = undefined;

	const makeEnterNode = (offset: number) => (node: SyntaxNodeRef) => {
		const nodeToText = (node: SyntaxNodeRef) => {
			return state.sliceDoc(node.from + offset, node.to + offset);
		};

		const found = targetLocation !== undefined;
		if (found) return false; // Skip this node

		let matches = false;
		if (node.name.startsWith('SetextHeading') || node.name.startsWith('ATXHeading')) {
			const nodeText = nodeToText(node)
				.replace(/^#+\s/, '') // Leading #s in headers
				.replace(/\n-+$/, ''); // Trailing --s in headers
			matches = hash === uslug(nodeText);
		} else if (node.name === 'HTMLBlock') {
			// CodeMirror adds HTML information to Markdown documents using overlays attached
			// to HTMLTag and HTMLBlock nodes.
			// Use .enter to enter the overlay and visit the HTML nodes:
			node.node.enter(node.from, 1).toTree().iterate({ enter: makeEnterNode(node.from) });
		} else if (node.name === 'OpenTag' || node.name === 'HTMLTag') {
			const htmlNodeDetails = htmlNodeInfo(node, state);
			matches = htmlNodeDetails.getAttr('id') === hash || htmlNodeDetails.getAttr('name') === hash;
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
