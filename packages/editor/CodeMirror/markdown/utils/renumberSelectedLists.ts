import { ChangeSpec, EditorSelection, EditorState, Line, SelectionRange, TransactionSpec } from '@codemirror/state';
import stripBlockquote from './stripBlockquote';
import tabsToSpaces from '../../utils/formatting/tabsToSpaces';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNodeRef } from '@lezer/common';

// Ensures that ordered lists within [sel] are numbered in ascending order.
const renumberSelectedLists = (state: EditorState): TransactionSpec => {
	const doc = state.doc;

	const listItemRegex = /^(\s*)(\d+)\.\s?/;

	// Re-numbers ordered lists and sublists with numbers on each line in [linesToHandle]
	const handleLines = (linesToHandle: Line[]) => {
		const changes: ChangeSpec[] = [];
		if (linesToHandle.length === 0) {
			return changes;
		}

		let firstListNumber = Number(listItemRegex.exec(linesToHandle[0].text)?.[2]);
		if (!isFinite(firstListNumber) || firstListNumber < 1) {
			firstListNumber = 1;
		}

		type ListItemRecord = {
			nextListNumber: number;
			indentationLength: number;
		};
		const listNumberStack: ListItemRecord[] = [];
		let currentGroupIndentation = '';
		let nextListNumber = firstListNumber;
		let prevLineNumber;

		for (const line of linesToHandle) {
			// Don't re-handle lines.
			if (line.number === prevLineNumber) {
				continue;
			}
			prevLineNumber = line.number;

			const filteredText = stripBlockquote(line);
			const match = filteredText.match(listItemRegex);

			// Skip lines that aren't the correct type (e.g. blank lines)
			if (!match) {
				continue;
			}

			const indentation = match[1];

			const indentationLen = tabsToSpaces(state, indentation).length;
			let targetIndentLen = tabsToSpaces(state, currentGroupIndentation).length;
			if (targetIndentLen < indentationLen) {
				listNumberStack.push({ nextListNumber, indentationLength: indentationLen });
				nextListNumber = 1;
			} else if (targetIndentLen > indentationLen) {
				nextListNumber = parseInt(match[2], 10);

				// Handle the case where we deindent multiple times. For example,
				// 1. test
				//    1. test
				//      1. test
				// 2. test
				while (targetIndentLen > indentationLen) {
					const listNumberRecord = listNumberStack.pop();

					if (!listNumberRecord) {
						break;
					} else {
						targetIndentLen = listNumberRecord.indentationLength;
						nextListNumber = listNumberRecord.nextListNumber;
					}
				}

			}

			if (targetIndentLen !== indentationLen) {
				currentGroupIndentation = indentation;
			}

			const from = line.to - filteredText.length;
			const to = from + match[0].length;
			const inserted = `${indentation}${nextListNumber}. `;
			nextListNumber++;

			changes.push({
				from,
				to,
				insert: inserted,
			});
		}

		return changes;
	};

	// Find all selected lists
	const selectedListRanges: SelectionRange[] = [];
	for (const selection of state.selection.ranges) {
		const listLines: Line[] = [];

		syntaxTree(state).iterate({
			from: selection.from,
			to: selection.to,
			enter: (nodeRef: SyntaxNodeRef) => {
				if (nodeRef.name === 'ListItem') {
					for (const node of nodeRef.node.parent.getChildren('ListItem')) {
						const line = doc.lineAt(node.from);
						const filteredText = stripBlockquote(line);
						const match = filteredText.match(listItemRegex);
						if (match) {
							listLines.push(line);
						}
					}
				}
			},
		});

		listLines.sort((a, b) => a.number - b.number);

		if (listLines.length > 0) {
			const fromLine = listLines[0];
			const toLine = listLines[listLines.length - 1];

			selectedListRanges.push(
				EditorSelection.range(fromLine.from, toLine.to),
			);
		}
	}

	const changes: ChangeSpec[] = [];
	if (selectedListRanges.length > 0) {
		// Use EditorSelection.create to merge overlapping lists
		const listsToHandle = EditorSelection.create(selectedListRanges).ranges;

		for (const listSelection of listsToHandle) {
			const lines = [];

			const startLine = doc.lineAt(listSelection.from);
			const endLine = doc.lineAt(listSelection.to);

			for (let i = startLine.number; i <= endLine.number; i++) {
				lines.push(doc.line(i));
			}

			changes.push(...handleLines(lines));
		}
	}

	return {
		changes,
	};
};

export default renumberSelectedLists;
