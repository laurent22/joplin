import { EditorSelection, EditorState, Line, SelectionRange, TransactionSpec } from '@codemirror/state';
import growSelectionToNode from '../growSelectionToNode';

// Toggles whether all lines in the user's selection start with [regex].
const toggleSelectedLinesStartWith = (
	state: EditorState,
	regex: RegExp,
	template: string,
	matchEmpty: boolean,

	// Determines where this formatting can begin on a line.
	// Defaults to after a block quote marker
	lineContentStartRegex = /^>\s/,

	// Name associated with what [regex] matches (e.g. FencedCode)
	nodeName?: string,
): TransactionSpec => {
	const getLineContentStart = (line: Line): number => {
		const blockQuoteMatch = line.text.match(lineContentStartRegex);
		if (blockQuoteMatch) {
			return line.from + blockQuoteMatch[0].length;
		}

		return line.from;
	};

	const getLineContent = (line: Line): string => {
		const contentStart = getLineContentStart(line);
		return line.text.substring(contentStart - line.from);
	};

	const changes = state.changeByRange((sel: SelectionRange) => {
		// Attempt to select all lines in the region
		if (nodeName && sel.empty) {
			sel = growSelectionToNode(state, sel, nodeName);
		}

		const doc = state.doc;
		const fromLine = doc.lineAt(sel.from);
		const toLine = doc.lineAt(sel.to);
		let hasProp = false;
		let charsAdded = 0;
		let charsAddedBefore = 0;

		const changes = [];
		const lines: Line[] = [];

		for (let i = fromLine.number; i <= toLine.number; i++) {
			const line = doc.line(i);
			const text = getLineContent(line);

			// If already matching [regex],
			if (text.search(regex) === 0) {
				hasProp = true;
			}

			lines.push(line);
		}

		for (const line of lines) {
			const text = getLineContent(line);
			const contentFrom = getLineContentStart(line);

			// Only process if the line is non-empty.
			if (!matchEmpty && text.trim().length === 0
				// Treat the first line differently
				&& fromLine.number < line.number) {
				continue;
			}

			if (hasProp) {
				const match = text.match(regex);
				if (!match) {
					continue;
				}
				changes.push({
					from: contentFrom,
					to: contentFrom + match[0].length,
					insert: '',
				});

				const deletedSize = match[0].length;
				if (contentFrom <= sel.from) {
					// Math.min: Handles the case where some deleted characters are before sel.from
					// and others are after.
					charsAddedBefore -= Math.min(sel.from - contentFrom, deletedSize);
				}
				charsAdded -= deletedSize;
			} else {
				changes.push({
					from: contentFrom,
					insert: template,
				});

				charsAdded += template.length;
				if (contentFrom <= sel.from) {
					charsAddedBefore += template.length;
				}
			}
		}

		// If the selection is empty and a single line was changed, don't grow it.
		// (user might be adding a list/header, in which case, selecting the just
		// added text isn't helpful)
		let newSel;
		if (sel.empty && fromLine.number === toLine.number) {
			newSel = EditorSelection.cursor(sel.from + charsAddedBefore);
		} else {
			newSel = EditorSelection.range(fromLine.from, toLine.to + charsAdded);
		}

		return {
			changes,

			// Selection should now encompass all lines that were changed.
			range: newSel,
		};
	});

	return changes;
};

export default toggleSelectedLinesStartWith;

