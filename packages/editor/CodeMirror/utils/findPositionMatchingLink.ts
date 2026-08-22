import { EditorState } from '@codemirror/state';
import uslug from '@joplin/fork-uslug/lib/uslug';
import { SyntaxNodeRef } from '@lezer/common';
import htmlNodeInfo from './htmlNodeInfo';
import { ensureSyntaxTree } from '@codemirror/language';

// Searches the given `state` for a line that matches the target link.
const findPositionMatchingLink = (link: string, state: EditorState): number|null => {
	const isAnchorLink = link.startsWith('#');
	const isFootnote = link.startsWith('[^') && link.endsWith(']');

	if (!isAnchorLink && !isFootnote) return null;

	if (isFootnote) {
		return findPositionMatchingFootnote(link, state);
	} else if (isAnchorLink) {
		return findPositionMatchingHash(link.substring(1), state);
	}

	return null;
};

const findPositionMatchingFootnote = (footnoteMarker: string, state: EditorState) => {
	let iterator = state.doc.iterLines();
	let lineNumber = 0;
	while (!iterator.done && lineNumber <= state.doc.lines) {
		lineNumber ++;
		iterator = iterator.next();
		const line = iterator.value;

		if (line.trim().startsWith(`${footnoteMarker}:`)) {
			return state.doc.line(lineNumber).to;
		}
	}
	return null;
};

const findPositionMatchingHash = (hash: string, state: EditorState) => {
	let targetLocation: number|null = null;

	const makeEnterNode = (offset: number) => (node: SyntaxNodeRef) => {
		const nodeToText = (node: SyntaxNodeRef) => {
			return state.sliceDoc(node.from + offset, node.to + offset);
		};

		const found = targetLocation !== null;
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
			node.node.enter(node.from, 1)?.toTree()?.iterate({ enter: makeEnterNode(node.from) });
		} else if (node.name === 'OpenTag' || node.name === 'HTMLTag') {
			const htmlNodeDetails = htmlNodeInfo(node, state);
			matches = htmlNodeDetails?.getAttr('id') === hash || htmlNodeDetails?.getAttr('name') === hash;
		}

		if (matches) {
			targetLocation = node.to + offset;
			return false;
		}

		const keepIterating = !matches;
		return keepIterating;
	};

	// Iterate over the entire syntax tree.
	const timeout = 1_000; // Maximum time to spend parsing the syntax tree
	ensureSyntaxTree(state, state.doc.length, timeout).iterate({
		enter: makeEnterNode(0),
	});

	return targetLocation;
};

export default findPositionMatchingLink;
