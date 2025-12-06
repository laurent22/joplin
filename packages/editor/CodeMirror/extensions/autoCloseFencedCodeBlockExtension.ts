import { EditorView } from '@codemirror/view';
import intersectsSyntaxNode from '../utils/isInSyntaxNode';

// Auto-completes fenced code blocks by adding closing backticks after typing three opening backticks
const autoCloseFencedCodeBlockExtension = () => {
	return EditorView.inputHandler.of((view: EditorView, from: number, to: number, text: string): boolean => {
		// Only handle single backtick input
		if (text !== '`') {
			return false;
		}

		const state = view.state;
		const doc = state.doc;

		// Don't trigger inside lists
		if (intersectsSyntaxNode(state, { from, to: from }, 'ListItem')) {
			return false;
		}

		// Get text before cursor
		const lineStart = doc.lineAt(from).from;
		const textBeforeCursor = doc.sliceString(lineStart, from);

		// Check if we just typed the third backtick in a sequence
		// Pattern: line starts with exactly two backticks (possibly with leading whitespace)
		const match = /^(\s*)``$/.exec(textBeforeCursor);

		if (!match) {
			return false;
		}

		// Insert: backtick + newline + three backticks
		const indent = match[1];
		const insert = `\`\n${indent}\`\`\``;

		const changes = state.changes({
			from: from,
			to: to,
			insert: insert,
		});

		// Position cursor right after the third backtick so user can type language identifier
		const cursorPos = from + 1;

		view.dispatch({
			changes,
			selection: { anchor: cursorPos },
			userEvent: 'input.type',
		});

		return true;
	});
};

export default autoCloseFencedCodeBlockExtension;
