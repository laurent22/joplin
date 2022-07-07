/**
 * CodeMirror 6 commands that modify markdown formatting (e.g. toggleBold).
 */

import { EditorView, Command } from '@codemirror/view';

import { ListType } from '../types';
import {
	SelectionRange, EditorSelection, ChangeSpec, Line, TransactionSpec, EditorState,
	Text as DocumentText,
} from '@codemirror/state';
import { getIndentUnit, indentString, syntaxTree } from '@codemirror/language';
import { SyntaxNodeRef } from '@lezer/common';
import RegionSpec from './RegionSpec';
import { logMessage } from './webviewLogger';

// Length of the symbol that starts a block quote
const blockQuoteStartLen = '> '.length;
const blockQuoteRegex = /^>\s/;
const startingSpaceRegex = /^(\s*)/;

// Specifies the update of a single selection region and its contents
type SelectionUpdate = { range: SelectionRange; changes?: ChangeSpec };

// Returns the text of [line], ignoring starting blockquote characters.
const stripBlockquote = (line: Line): string => {
	const match = line.text.match(blockQuoteRegex);

	if (match) {
		return line.text.substring(match[0].length);
	}

	return line.text;
};

// Returns a version of [text] with all tabs converted to spaces
export const tabsToSpaces = (state: EditorState, text: string): string => {
	const chunks = text.split('\t');
	const spaceLen = getIndentUnit(state);
	let result = chunks[0];

	for (let i = 1; i < chunks.length; i++) {
		for (let j = result.length % spaceLen; j < spaceLen; j++) {
			result += ' ';
		}

		result += chunks[i];
	}
	return result;
};

// Returns true iff [a] (an indentation string) is roughly equivalent to [b] (also)
// an indentation string.
const isIndentationEquivalent = (state: EditorState, a: string, b: string): boolean => {
	// Consider sublists to be the same as their parent list if they have the same
	// label plus or minus 1 space.
	return Math.abs(tabsToSpaces(state, a).length - tabsToSpaces(state, b).length) <= 1;
};

// Expands [sel] to the smallest container node with name in [nodeNames].
// Returns a new selection.
const growSelectionToNode = (
	state: EditorState, sel: SelectionRange, nodeNames: string|string[]
): SelectionRange => {
	let newFrom = null;
	let newTo = null;
	let smallestLen = Infinity;

	const isAcceptableNode = (name: string): boolean => {
		if (typeof nodeNames == 'string') {
			return name == nodeNames;
		}

		for (const otherName of nodeNames) {
			if (otherName == name) {
				return true;
			}
		}

		return false;
	};

	// Find the smallest range.
	syntaxTree(state).iterate({
		from: sel.from, to: sel.to,
		enter: node => {
			if (isAcceptableNode(node.name)) {
				if (node.to - node.from < smallestLen) {
					newFrom = node.from;
					newTo = node.to;
					smallestLen = newTo - newFrom;
				}
			}
		},
	});

	// If it's in such a node,
	if (newFrom != null && newTo != null) {
		return EditorSelection.range(newFrom, newTo);
	} else {
		return sel;
	}
};

// Adds/removes [spec.templateStart] before the current selection and
// [spec.templateStop] after it.
// For example, surroundSelecton('**', '**') surrounds every selection
// range with asterisks (including the caret).
// If the selection is already surrounded by these characters, they are
// removed.
const toggleRegionSurrounded = (
	doc: DocumentText, sel: SelectionRange, spec: RegionSpec
): SelectionUpdate => {
	let content = doc.sliceString(sel.from, sel.to);
	const startMatchLen = spec.matchStart(doc, sel);
	const endMatchLen = spec.matchStop(doc, sel);

	const startsWithBefore = startMatchLen >= 0;
	const endsWithAfter = endMatchLen >= 0;

	const changes = [];
	let finalSelStart = sel.from;
	let finalSelStop = sel.to;

	if (startsWithBefore && endsWithAfter) {
		// Remove the before and after.
		content = content.substring(startMatchLen);
		content = content.substring(0, content.length - endMatchLen);

		finalSelStop -= startMatchLen + endMatchLen;

		changes.push({
			from: sel.from,
			to: sel.to,
			insert: content,
		});
	} else {
		changes.push({
			from: sel.from,
			insert: spec.templateStart,
		});

		changes.push({
			from: sel.to,
			insert: spec.templateStop,
		});

		// If not a caret,
		if (!sel.empty) {
			// Select the surrounding chars.
			finalSelStop += spec.templateStart.length + spec.templateStop.length;
		} else {
			// Position the caret within the added content.
			finalSelStart = sel.from + spec.templateStart.length;
			finalSelStop = finalSelStart;
		}
	}

	return {
		changes,
		range: EditorSelection.range(finalSelStart, finalSelStop),
	};
};

// Toggles whether the current selection/caret location is
// associated with [nodeName], if [start] defines the start of
// the region and [end], the end.
const toggleGlobalSelectionFormat = (
	state: EditorState, nodeName: string, spec: RegionSpec
): TransactionSpec => {
	const changes = state.changeByRange((sel: SelectionRange) => {
		return toggleSelectionFormat(state, nodeName, sel, spec);
	});
	return changes;
};

const toggleSelectionFormat = (
	state: EditorState, nodeName: string, sel: SelectionRange, spec: RegionSpec
): SelectionUpdate => {
	const endMatchLen = spec.matchStop(state.doc, sel);

	// If at the end of the region, move the
	// caret to the end.
	// E.g.
	//   **foobar|**
	//   **foobar**|
	if (sel.empty && endMatchLen > -1) {
		const newCursorPos = sel.from + endMatchLen;

		return {
			range: EditorSelection.cursor(newCursorPos),
		};
	}

	// Grow the selection to encompass the entire node.
	const newRange = growSelectionToNode(state, sel, nodeName);
	return toggleRegionSurrounded(state.doc, newRange, spec);
};

// Toggle formatting in a region, applying a block version of the formatting
// if multiple lines are selected.
export const toggleRegionFormat = (
	state: EditorState,

	inlineNodeName: string, inlineSpec: RegionSpec,

	// The block version of the tag (e.g. fenced code)
	blockNodeName: string,
	blockRegex: { start: RegExp; stop: RegExp },

	// start: Single-line content that precedes the block
	// stop: Single-line content that follows the block.
	// line breaks will be added
	blockTemplate: { start: string; stop: string },

	// If false, don't ensure that block formatting preserves block quotes
	preserveBlockQuotes: boolean = true
) => {
	const doc = state.doc;

	const getMatchEndPoints = (
		match: RegExpMatchArray, line: Line, inBlockQuote: boolean
	): [startIdx: number, stopIdx: number] => {
		const startIdx = line.from + match.index;
		let stopIdx;

		let contentLength = line.text.length;

		// Don't treat '> ' as part of the line's content if we're in a blockquote.
		if (inBlockQuote && preserveBlockQuotes) {
			contentLength -= blockQuoteStartLen;
		}

		// If it matches the entire line, remove the newline character.
		if (match[0].length == contentLength) {
			stopIdx = line.to + 1;
		} else {
			stopIdx = startIdx + match[0].length;

			// Take into account the extra '> ' characters, if necessary
			if (inBlockQuote && preserveBlockQuotes) {
				stopIdx += blockQuoteStartLen;
			}
		}

		stopIdx = Math.min(stopIdx, doc.length);
		return [startIdx, stopIdx];
	};

	// Returns a change spec that converts an inline region to a block region
	// only if the user's cursor is in an empty inline region.
	// For example,
	//    $|$ -> $$\n|\n$$ where | represents the cursor.
	const handleInlineToBlockConversion = (sel: SelectionRange) => {
		if (!sel.empty) {
			return null;
		}

		const startMatchLen = inlineSpec.matchStart(doc, sel);
		const stopMatchLen = inlineSpec.matchStop(doc, sel);

		if (startMatchLen >= 0 && stopMatchLen >= 0) {
			const inlineStart = sel.from - startMatchLen;
			const inlineStop = sel.from + stopMatchLen;

			const fromLine = doc.lineAt(sel.from);
			const inBlockQuote = fromLine.text.match(blockQuoteRegex);

			let lineStartStr = '\n';
			if (inBlockQuote && preserveBlockQuotes) {
				lineStartStr = '\n> ';
			}

			// Determine the text that starts the new block (e.g. \n$$\n for
			// a math block).
			let blockStart = `${blockTemplate.start}${lineStartStr}`;
			if (fromLine.from != inlineStart) {
				// Add a line before to put the start of the block
				// on its own line.
				blockStart = lineStartStr + blockStart;
			}

			return {
				changes: [
					{
						from: inlineStart,
						to: inlineStop,
						insert: `${blockStart}${lineStartStr}${blockTemplate.stop}`,
					},
				],

				range: EditorSelection.cursor(inlineStart + blockStart.length),
			};
		}

		return null;
	};

	const changes = state.changeByRange((sel: SelectionRange) => {
		const blockConversion = handleInlineToBlockConversion(sel);
		if (blockConversion) {
			return blockConversion;
		}

		// If we're in the block version, grow the selection to cover the entire region.
		sel = growSelectionToNode(state, sel, blockNodeName);

		const fromLine = doc.lineAt(sel.from);
		const toLine = doc.lineAt(sel.to);
		let fromLineText = fromLine.text;
		let toLineText = toLine.text;

		let charsAdded = 0;
		const changes = [];

		// Single line: Inline toggle.
		if (fromLine.number == toLine.number) {
			return toggleSelectionFormat(state, inlineNodeName, sel, inlineSpec);
		}

		// Are all lines in a block quote?
		let inBlockQuote = true;
		for (let i = fromLine.number; i <= toLine.number; i++) {
			const line = doc.line(i);

			if (!line.text.match(blockQuoteRegex)) {
				inBlockQuote = false;
				break;
			}
		}

		// Ignore block quote characters if in a block quote.
		if (inBlockQuote && preserveBlockQuotes) {
			fromLineText = fromLineText.substring(blockQuoteStartLen);
			toLineText = toLineText.substring(blockQuoteStartLen);
		}

		// Otherwise, we're toggling the block version
		const startMatch = blockRegex.start.exec(fromLineText);
		const stopMatch = blockRegex.stop.exec(toLineText);
		if (startMatch && stopMatch) {
			// Get start and stop indicies for the starting and ending matches
			const [fromMatchFrom, fromMatchTo] = getMatchEndPoints(startMatch, fromLine, inBlockQuote);
			const [toMatchFrom, toMatchTo] = getMatchEndPoints(stopMatch, toLine, inBlockQuote);

			// Delete content of the first line
			changes.push({
				from: fromMatchFrom,
				to: fromMatchTo,
			});
			charsAdded -= fromMatchTo - fromMatchFrom;

			// Delete content of the last line
			changes.push({
				from: toMatchFrom,
				to: toMatchTo,
			});
			charsAdded -= toMatchTo - toMatchFrom;
		} else {
			let insertBefore, insertAfter;

			if (inBlockQuote && preserveBlockQuotes) {
				insertBefore = `> ${blockTemplate.start}\n`;
				insertAfter = `\n> ${blockTemplate.stop}`;
			} else {
				insertBefore = `${blockTemplate.start}\n`;
				insertAfter = `\n${blockTemplate.stop}`;
			}

			changes.push({
				from: fromLine.from,
				insert: insertBefore,
			});

			changes.push({
				from: toLine.to,
				insert: insertAfter,
			});
			charsAdded += insertBefore.length + insertAfter.length;
		}

		return {
			changes,

			// Selection should now encompass all lines that were changed.
			range: EditorSelection.range(
				fromLine.from, toLine.to + charsAdded
			),
		};
	});

	return changes;
};

// Toggles whether all lines in the user's selection start with [regex].
// [template] is that match of [regex] that is used when adding a match.
// [template] can also be a function that maps a given line to a string.
// If so, it is called on each line of a selection sequentially, starting
// with the first. [lineContent], in that case, is the portion of the line
// relevant to the match (e.g. in a block quote, everything after "> ").
// If [matchEmpty], all lines **after the first** that have no non-space
// content are ignored.
// [nodeName], if given, is the name of the node to expand the selection
// to, (e.g. TaskList to expand selections to containing TaskLists if possible).
// Note that selection is only expanded if the existing selection is empty
// (just a caret).
export const toggleSelectedLinesStartWith = (
	state: EditorState,
	regex: RegExp,
	template: string,
	matchEmpty: boolean, nodeName?: string, ignoreBlockQuotes: boolean = true
): TransactionSpec => {
	const getLineContentStart = (line: Line): number => {
		if (!ignoreBlockQuotes) {
			return line.from;
		}

		const blockQuoteMatch = line.text.match(blockQuoteRegex);
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

		const changes = [];
		const lines = [];

		for (let i = fromLine.number; i <= toLine.number; i++) {
			const line = doc.line(i);
			const text = getLineContent(line);

			// If already matching [regex],
			if (text.search(regex) == 0) {
				hasProp = true;
			}

			lines.push(line);
		}

		for (const line of lines) {
			const text = getLineContent(line);
			const contentFrom = getLineContentStart(line);

			// Only process if the line is non-empty.
			if (!matchEmpty && text.trim().length == 0
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

				charsAdded -= match[0].length;
			} else {
				changes.push({
					from: contentFrom,
					insert: template,
				});

				charsAdded += template.length;
			}
		}

		// If the selection is empty and a single line was changed, don't grow it.
		// (user might be adding a list/header, in which case, selecting the just
		// added text isn't helpful)
		let newSel;
		if (sel.empty && fromLine.number == toLine.number) {
			const regionEnd = toLine.to + charsAdded;
			newSel = EditorSelection.cursor(regionEnd);
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

export const renumberList = (state: EditorState, sel: SelectionRange): SelectionUpdate => {
	const doc = state.doc;

	const listItemRegex = /^(\s*)(\d+)\.\s?/;
	const changes: ChangeSpec[] = [];
	const fromLine = doc.lineAt(sel.from);
	const toLine = doc.lineAt(sel.to);
	let charsAdded = 0;

	const handleLines = (linesToHandle: Line[]) => {
		let currntGroupIndentation = '';
		let nextListNumber = 1;
		const listNumberStack: number[] = [];
		let prevLineNumber;

		for (const line of linesToHandle) {
			if (line.number == prevLineNumber) {
				continue;
			}
			prevLineNumber = line.number;

			const filteredText = stripBlockquote(line);
			const match = filteredText.match(listItemRegex);
			const indentation = match[1];

			const indentationLen = tabsToSpaces(state, indentation).length;
			const targetIndentLen = tabsToSpaces(state, currntGroupIndentation).length;
			if (targetIndentLen < indentationLen) {
				listNumberStack.push(nextListNumber);
				nextListNumber = 1;
			} else if (targetIndentLen > indentationLen) {
				nextListNumber = listNumberStack.pop() ?? parseInt(match[2], 10);
			}

			if (targetIndentLen != indentationLen) {
				currntGroupIndentation = indentation;
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
			charsAdded -= to - from;
			charsAdded += inserted.length;
		}
	};

	const linesToHandle: Line[] = [];
	syntaxTree(state).iterate({
		from: sel.from,
		to: sel.to,
		enter: (nodeRef: SyntaxNodeRef) => {
			if (nodeRef.name == 'ListItem') {
				for (const node of nodeRef.node.parent.getChildren('ListItem')) {
					const line = doc.lineAt(node.from);
					const filteredText = stripBlockquote(line);
					const match = filteredText.match(listItemRegex);
					if (match) {
						linesToHandle.push(line);
					}
				}
			}
		},
	});


	linesToHandle.sort((a, b) => a.number - b.number);
	handleLines(linesToHandle);

	// Re-position the selection in a way that makes sense
	if (sel.empty) {
		sel = EditorSelection.cursor(toLine.to + charsAdded);
	} else {
		sel = EditorSelection.range(
			fromLine.from,
			toLine.to + charsAdded
		);
	}

	return {
		range: sel,
		changes,
	};
};

// Bolds/unbolds the current selection.
export const toggleBolded: Command = (view: EditorView): boolean => {
	logMessage('Toggling bolded!');

	const changes = toggleGlobalSelectionFormat(view.state, 'StrongEmphasis', new RegionSpec({
		templateStart: '**',
		templateStop: '**',
	}));

	view.dispatch(changes);
	return true;
};

// Italicizes/deitalicizes the current selection.
export const toggleItalicized: Command = (view: EditorView): boolean => {
	logMessage('Toggling italicized!');

	const changes = toggleGlobalSelectionFormat(view.state, 'Emphasis', new RegionSpec({
		// Template start/end
		templateStart: '_',
		templateStop: '_',

		// Regular expressions that match all possible start/ends
		startExp: /[_*]/g,
		stopExp: /[_*]/g,
	}));
	view.dispatch(changes);

	return true;
};

export const toggleCode: Command = (view: EditorView): boolean => {
	logMessage('Toggling code!');

	const codeFenceRegex = /^```\w*\s*$/;
	const inlineRegionSpec = new RegionSpec({
		templateStart: '`',
		templateStop: '`',
	});

	const changes = toggleRegionFormat(
		view.state,
		'InlineCode', inlineRegionSpec,

		'FencedCode', { start: codeFenceRegex, stop: codeFenceRegex },
		{ start: '```', stop: '```' }
	);
	view.dispatch(changes);
	return true;
};

export const toggleMath: Command = (view: EditorView): boolean => {
	logMessage('Toggling math!');

	const blockStartRegex = /^\$\$/;
	const blockStopRegex = /\$\$\s*$/;
	const inlineRegionSpec = new RegionSpec({
		templateStart: '$',
		templateStop: '$',
	});

	const changes = toggleRegionFormat(
		view.state,
		'InlineMath', inlineRegionSpec,

		'BlockMath', { start: blockStartRegex, stop: blockStopRegex },
		{ start: '$$', stop: '$$' }
	);
	view.dispatch(changes);

	return true;
};

export const toggleList = (listType: ListType): Command => {
	return (view: EditorView): boolean => {
		logMessage('Toggling list!');

		let state = view.state;
		let doc = state.doc;

		const orderedListTag = 'OrderedList';
		const unorderedListTag = 'BulletList';

		// RegExps for different list types. The regular expressions MUST
		// be mutually exclusive.
		// `(?!\[[ xX]+\]\s?)` means "not followed by [x] or [ ]".
		const bulletedRegex = /^\s*([-*])(?!\s\[[ xX]+\])\s?/;
		const checklistRegex = /^\s*[-*]\s\[[ xX]+\]\s?/;
		const numberedRegex = /^\s*\d+\.\s?/;

		const listRegexes: Record<ListType, RegExp> = {
			[ListType.OrderedList]: numberedRegex,
			[ListType.CheckList]: checklistRegex,
			[ListType.UnorderedList]: bulletedRegex,
		};

		const getContainerType = (line: Line): ListType|null => {
			const lineContent = stripBlockquote(line);

			// Determine the container's type.
			const checklistMatch = lineContent.match(checklistRegex);
			const bulletListMatch = lineContent.match(bulletedRegex);
			const orderedListMatch = lineContent.match(numberedRegex);

			if (checklistMatch) {
				return ListType.CheckList;
			} else if (bulletListMatch) {
				return ListType.UnorderedList;
			} else if (orderedListMatch) {
				return ListType.OrderedList;
			}

			return null;
		};

		const changes: TransactionSpec = state.changeByRange((sel: SelectionRange) => {
			const changes: ChangeSpec[] = [];
			let containerType: ListType|null = null;

			// Total number of characters added (deleted if negative)
			let charsAdded = 0;

			const originalSel = sel;
			let fromLine: Line;
			let toLine: Line;
			let firstLineIndentation: string;
			let firstLineInBlockQuote: boolean;
			let fromLineContent: string;
			const computeSelectionProps = () => {
				fromLine = doc.lineAt(sel.from);
				toLine = doc.lineAt(sel.to);
				fromLineContent = stripBlockquote(fromLine);
				firstLineIndentation = fromLineContent.match(startingSpaceRegex)[0];
				firstLineInBlockQuote = (fromLineContent != fromLine.text);

				containerType = getContainerType(fromLine);
			};
			computeSelectionProps();

			const origFirstLineIndentation = firstLineIndentation;
			const origContainerType = containerType;

			// Grow [sel] to the smallest containing list
			if (sel.empty) {
				sel = growSelectionToNode(state, sel, [orderedListTag, unorderedListTag]);
				computeSelectionProps();
			}

			// Reset the selection if it seems likely the user didn't want the selection
			// to be expanded
			const isIndentationDiff =
				!isIndentationEquivalent(state, firstLineIndentation, origFirstLineIndentation);
			if (isIndentationDiff) {
				const expandedRegionIndentation = firstLineIndentation;
				sel = originalSel;
				computeSelectionProps();

				// Use the indentation level of the expanded region if it's greater.
				// This makes sense in the case where unindented text is being converted to
				// the same type of list as its container. For example,
				//     1. Foobar
				// unindented text
				// that should be made a part of the above list.
				//
				// becoming
				//
				//     1. Foobar
				//     2. unindented text
				//     3. that should be made a part of the above list.
				const wasGreaterIndentation = (
					tabsToSpaces(state, expandedRegionIndentation).length
						> tabsToSpaces(state, firstLineIndentation).length
				);
				if (wasGreaterIndentation) {
					firstLineIndentation = expandedRegionIndentation;
				}
			} else if (
				(origContainerType != containerType && origContainerType != null)
					|| containerType != getContainerType(toLine)
			) {
				// If the container type changed, this could be an artifact of checklists/bulleted
				// lists sharing the same node type.
				// Find the closest range of the same type of list to the original selection
				let newFromLineNo = doc.lineAt(originalSel.from).number;
				let newToLineNo = doc.lineAt(originalSel.to).number;
				let lastFromLineNo;
				let lastToLineNo;

				while (newFromLineNo != lastFromLineNo || newToLineNo != lastToLineNo) {
					lastFromLineNo = newFromLineNo;
					lastToLineNo = newToLineNo;

					if (lastFromLineNo - 1 >= 1) {
						const testFromLine = doc.line(lastFromLineNo - 1);
						if (getContainerType(testFromLine) == origContainerType) {
							newFromLineNo --;
						}
					}

					if (lastToLineNo + 1 <= doc.lines) {
						const testToLine = doc.line(lastToLineNo + 1);
						if (getContainerType(testToLine) == origContainerType) {
							newToLineNo ++;
						}
					}
				}

				sel = EditorSelection.range(
					doc.line(newFromLineNo).from,
					doc.line(newToLineNo).to
				);
				computeSelectionProps();
			}

			// Determine whether the expanded selection should be empty
			if (originalSel.empty && fromLine.number == toLine.number) {
				sel = EditorSelection.cursor(toLine.to);
			}

			// Select entire lines (if not just a cursor)
			if (!sel.empty) {
				sel = EditorSelection.range(fromLine.from, toLine.to);
			}

			// Number of the item in the list (e.g. 2 for the 2nd item in the list)
			let listItemCounter = 1;
			for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum ++) {
				const line = doc.line(lineNum);
				const lineContent = stripBlockquote(line);
				const lineContentFrom = line.to - lineContent.length;
				const inBlockQuote = (lineContent != line.text);
				const indentation = lineContent.match(startingSpaceRegex)[0];

				const wrongIndentaton = !isIndentationEquivalent(state, indentation, firstLineIndentation);

				// If not the right list level,
				if (inBlockQuote != firstLineInBlockQuote || wrongIndentaton) {
					// We'll be starting a new list
					listItemCounter = 1;
					continue;
				}

				// Don't add list numbers to otherwise empty lines (unless it's the first line)
				if (lineNum != fromLine.number && line.text.trim().length == 0) {
					// Do not reset the counter -- the markdown renderer doesn't!
					continue;
				}

				const deleteFrom = lineContentFrom;
				let deleteTo = deleteFrom + indentation.length;

				// If we need to remove an existing list,
				const currentContainer = getContainerType(line);
				if (currentContainer != null) {
					const containerRegex = listRegexes[currentContainer];
					const containerMatch = lineContent.match(containerRegex);
					if (!containerMatch) {
						throw new Error(
							'Assertion failed: container regex does not match line content.'
						);
					}

					deleteTo = lineContentFrom + containerMatch[0].length;
				}

				let replacementString;

				if (listType == containerType) {
					// Delete the existing list if it's the same type as the current
					replacementString = '';
				} else if (listType == ListType.OrderedList) {
					replacementString = `${firstLineIndentation}${listItemCounter}. `;
				} else if (listType == ListType.CheckList) {
					replacementString = `${firstLineIndentation}- [ ] `;
				} else {
					replacementString = `${firstLineIndentation}- `;
				}

				changes.push({
					from: deleteFrom,
					to: deleteTo,
					insert: replacementString,
				});
				charsAdded -= deleteTo - deleteFrom;
				charsAdded += replacementString.length;
				listItemCounter++;
			}

			// Don't change cursors to selections
			if (sel.empty) {
				// Position the cursor at the end of the last line modified
				sel = EditorSelection.cursor(toLine.to + charsAdded);
			} else {
				sel = EditorSelection.range(
					sel.from,
					sel.to + charsAdded
				);
			}

			return {
				changes,
				range: sel,
			};
		});
		view.dispatch(changes);
		state = view.state;
		doc = state.doc;

		// Renumber the list
		view.dispatch(state.changeByRange((sel: SelectionRange) => {
			return renumberList(state, sel);
		}));

		return true;
	};
};

export const toggleHeaderLevel = (level: number): Command => {
	return (view: EditorView): boolean => {
		logMessage(`Setting heading level to ${level}`);

		let headerStr = '';
		for (let i = 0; i < level; i++) {
			headerStr += '#';
		}

		const matchEmpty = true;
		// Remove header formatting for any other level
		let changes = toggleSelectedLinesStartWith(
			view.state,
			new RegExp(
				// Check all numbers of #s lower than [level]
				`${level - 1 >= 1 ? `(?:^[#]{1,${level - 1}}\\s)|` : ''

				// Check all number of #s higher than [level]
				}(?:^[#]{${level + 1},}\\s)`
			),
			'',
			matchEmpty
		);
		view.dispatch(changes);

		// Set to the proper header level
		changes = toggleSelectedLinesStartWith(
			view.state,
			// We want exactly [level] '#' characters.
			new RegExp(`^[#]{${level}} `),
			`${headerStr} `,
			matchEmpty
		);
		view.dispatch(changes);

		return true;
	};
};

export const increaseIndent: Command = (view: EditorView): boolean => {
	logMessage('Increasing indentation.');
	const matchEmpty = true;
	const matchNothing = /$ ^/;
	const indentUnit = indentString(view.state, getIndentUnit(view.state));

	const changes = toggleSelectedLinesStartWith(
		view.state,
		// Delete nothing
		matchNothing,
		// ...and thus always add indentUnit.
		indentUnit,
		matchEmpty
	);
	view.dispatch(changes);

	// Fix any lists
	view.dispatch(view.state.changeByRange((sel: SelectionRange) => {
		return renumberList(view.state, sel);
	}));

	return true;
};

export const decreaseIndent: Command = (view: EditorView): boolean => {
	logMessage('Decreasing indentation.');
	const matchEmpty = true;
	const changes = toggleSelectedLinesStartWith(
		view.state,
		// Assume indentation is either a tab or in units
		// of n spaces.
		new RegExp(`^(?:[\\t]|[ ]{1,${getIndentUnit(view.state)}})`),
		// Don't add new text
		'',
		matchEmpty
	);

	view.dispatch(changes);

	// Fix any lists
	view.dispatch(view.state.changeByRange((sel: SelectionRange) => {
		return renumberList(view.state, sel);
	}));

	return true;
};

// Create a new link with [label] and [url], or, if a link is either partially
// or fully selected, update the label and URL of that link.
export const updateLink = (label: string, url: string): Command => {
	// Empty label? Just include the URL.
	const linkText = label == '' ? url : `[${label}](${url})`;

	return (editor: EditorView): boolean => {
		const transaction = editor.state.changeByRange((sel: SelectionRange) => {
			const changes = [];

			// Search for a link that overlaps [sel]
			let linkFrom: number | null = null;
			let linkTo: number | null = null;
			syntaxTree(editor.state).iterate({
				from: sel.from, to: sel.to,
				enter: node => {
					const haveFoundLink = (linkFrom != null && linkTo != null);

					if (node.name == 'Link' || (node.name == 'URL' && !haveFoundLink)) {
						linkFrom = node.from;
						linkTo = node.to;
					}
				},
			});

			if (linkFrom == null || linkTo == null) {
				linkFrom = sel.from;
				linkTo = sel.to;
			}

			changes.push({
				from: linkFrom, to: linkTo,
				insert: linkText,
			});

			return {
				changes,
				range: EditorSelection.range(linkFrom, linkFrom + linkText.length),
			};
		});

		editor.dispatch(transaction);
		return true;
	};
};
