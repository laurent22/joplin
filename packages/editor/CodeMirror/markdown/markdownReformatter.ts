import {
	Text as DocumentText, EditorSelection, SelectionRange, ChangeSpec, EditorState, Line, TransactionSpec,
} from '@codemirror/state';
import { getIndentUnit, syntaxTree } from '@codemirror/language';
import { SyntaxNodeRef } from '@lezer/common';

// pregQuote escapes text for usage in regular expressions
const { pregQuote } = require('@joplin/lib/string-utils-common');

// Length of the symbol that starts a block quote
const blockQuoteStartLen = '> '.length;
const blockQuoteRegex = /^>\s/;

// Specifies the update of a single selection region and its contents
type SelectionUpdate = { range: SelectionRange; changes?: ChangeSpec };

// Specifies how a to find the start/stop of a type of formatting
interface RegionMatchSpec {
	start: RegExp;
	end: RegExp;
}

// Describes a region's formatting
export interface RegionSpec {
	// The name of the node corresponding to the region in the syntax tree
	nodeName?: string;

	// Text to be inserted before and after the region when toggling.
	template: { start: string; end: string };

	// How to identify the region
	matcher: RegionMatchSpec;
}

export namespace RegionSpec { // eslint-disable-line no-redeclare
	interface RegionSpecConfig {
		nodeName?: string;
		template: string | { start: string; end: string };
		matcher?: RegionMatchSpec;
	}

	// Creates a new RegionSpec, given a simplified set of options.
	// If [config.template] is a string, it is used as both the starting and ending
	// templates.
	// Similarly, if [config.matcher] is not given, a matcher is created based on
	// [config.template].
	export const of = (config: RegionSpecConfig): RegionSpec => {
		let templateStart: string, templateEnd: string;
		if (typeof config.template === 'string') {
			templateStart = config.template;
			templateEnd = config.template;
		} else {
			templateStart = config.template.start;
			templateEnd = config.template.end;
		}

		const matcher: RegionMatchSpec =
			config.matcher ?? matcherFromTemplate(templateStart, templateEnd);

		return {
			nodeName: config.nodeName,
			template: { start: templateStart, end: templateEnd },
			matcher,
		};
	};

	const matcherFromTemplate = (start: string, end: string): RegionMatchSpec => {
		// See https://stackoverflow.com/a/30851002
		const escapedStart = pregQuote(start);
		const escapedEnd = pregQuote(end);

		return {
			start: new RegExp(escapedStart, 'g'),
			end: new RegExp(escapedEnd, 'g'),
		};
	};
}

export enum MatchSide {
	Start,
	End,
}

// Returns the length of a match for this in the given selection,
// -1 if no match is found.
export const findInlineMatch = (
	doc: DocumentText, spec: RegionSpec, sel: SelectionRange, side: MatchSide,
): number => {
	const [regex, template] = (() => {
		if (side === MatchSide.Start) {
			return [spec.matcher.start, spec.template.start];
		} else {
			return [spec.matcher.end, spec.template.end];
		}
	})();
	const [startIndex, endIndex] = (() => {
		if (!sel.empty) {
			return [sel.from, sel.to];
		}

		const bufferSize = template.length;
		if (side === MatchSide.Start) {
			return [sel.from - bufferSize, sel.to];
		} else {
			return [sel.from, sel.to + bufferSize];
		}
	})();
	const searchText = doc.sliceString(startIndex, endIndex);

	// Returns true if [idx] is in the right place (the match is at
	// the end of the string or the beginning based on startIndex/endIndex).
	const indexSatisfies = (idx: number, len: number): boolean => {
		idx += startIndex;
		if (side === MatchSide.Start) {
			return idx === startIndex;
		} else {
			return idx + len === endIndex;
		}
	};

	// Enforce 'g' flag.
	if (!regex.global) {
		throw new Error('Regular expressions used by RegionSpec must have the global flag!');
	}

	// Search from the beginning.
	regex.lastIndex = 0;

	let foundMatch = null;
	let match;
	while ((match = regex.exec(searchText)) !== null) {
		if (indexSatisfies(match.index, match[0].length)) {
			foundMatch = match;
			break;
		}
	}

	if (foundMatch) {
		const matchLength = foundMatch[0].length;
		const matchIndex = foundMatch.index;

		// If the match isn't in the right place,
		if (indexSatisfies(matchIndex, matchLength)) {
			return matchLength;
		}
	}

	return -1;
};

export const stripBlockquote = (line: Line): string => {
	const match = line.text.match(blockQuoteRegex);

	if (match) {
		return line.text.substring(match[0].length);
	}

	return line.text;
};

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

// Returns true iff [a] (an indentation string) is roughly equivalent to [b].
export const isIndentationEquivalent = (state: EditorState, a: string, b: string): boolean => {
	// Consider sublists to be the same as their parent list if they have the same
	// label plus or minus 1 space.
	return Math.abs(tabsToSpaces(state, a).length - tabsToSpaces(state, b).length) <= 1;
};

// Expands and returns a copy of [sel] to the smallest container node with name in [nodeNames].
export const growSelectionToNode = (
	state: EditorState, sel: SelectionRange, nodeNames: string|string[]|null,
): SelectionRange => {
	if (!nodeNames) {
		return sel;
	}

	const isAcceptableNode = (name: string): boolean => {
		if (typeof nodeNames === 'string') {
			return name === nodeNames;
		}

		for (const otherName of nodeNames) {
			if (otherName === name) {
				return true;
			}
		}

		return false;
	};

	let newFrom = null;
	let newTo = null;
	let smallestLen = Infinity;

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
	if (newFrom !== null && newTo !== null) {
		return EditorSelection.range(newFrom, newTo);
	} else {
		return sel;
	}
};

// Toggles whether the given selection matches the inline region specified by [spec].
//
// For example, something similar to toggleSurrounded('**', '**') would surround
// every selection range with asterisks (including the caret).
// If the selection is already surrounded by these characters, they are
// removed.
const toggleInlineRegionSurrounded = (
	doc: DocumentText, sel: SelectionRange, spec: RegionSpec,
): SelectionUpdate => {
	let content = doc.sliceString(sel.from, sel.to);
	const startMatchLen = findInlineMatch(doc, spec, sel, MatchSide.Start);
	const endMatchLen = findInlineMatch(doc, spec, sel, MatchSide.End);

	const startsWithBefore = startMatchLen >= 0;
	const endsWithAfter = endMatchLen >= 0;

	const changes = [];
	let finalSelStart = sel.from;
	let finalSelEnd = sel.to;

	if (startsWithBefore && endsWithAfter) {
		// Remove the before and after.
		content = content.substring(startMatchLen);
		content = content.substring(0, content.length - endMatchLen);

		finalSelEnd -= startMatchLen + endMatchLen;

		changes.push({
			from: sel.from,
			to: sel.to,
			insert: content,
		});
	} else {
		changes.push({
			from: sel.from,
			insert: spec.template.start,
		});

		changes.push({
			from: sel.to,
			insert: spec.template.start,
		});

		// If not a caret,
		if (!sel.empty) {
			// Select the surrounding chars.
			finalSelEnd += spec.template.start.length + spec.template.end.length;
		} else {
			// Position the caret within the added content.
			finalSelStart = sel.from + spec.template.start.length;
			finalSelEnd = finalSelStart;
		}
	}

	return {
		changes,
		range: EditorSelection.range(finalSelStart, finalSelEnd),
	};
};

// Returns updated selections: For all selections in the given `EditorState`, toggles
// whether each is contained in an inline region of type [spec].
export const toggleInlineSelectionFormat = (
	state: EditorState, spec: RegionSpec, sel: SelectionRange,
): SelectionUpdate => {
	const endMatchLen = findInlineMatch(state.doc, spec, sel, MatchSide.End);

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
	const newRange = growSelectionToNode(state, sel, spec.nodeName);
	return toggleInlineRegionSurrounded(state.doc, newRange, spec);
};

// Like toggleInlineSelectionFormat, but for all selections in [state].
export const toggleInlineFormatGlobally = (
	state: EditorState, spec: RegionSpec,
): TransactionSpec => {
	const changes = state.changeByRange((sel: SelectionRange) => {
		return toggleInlineSelectionFormat(state, spec, sel);
	});
	return changes;
};

// Toggle formatting in a region, applying block formatting
export const toggleRegionFormatGlobally = (
	state: EditorState,

	inlineSpec: RegionSpec,
	blockSpec: RegionSpec,
): TransactionSpec => {
	const doc = state.doc;
	const preserveBlockQuotes = true;

	const getMatchEndPoints = (
		match: RegExpMatchArray, line: Line, inBlockQuote: boolean,
	): [startIdx: number, stopIdx: number] => {
		const startIdx = line.from + match.index;
		let stopIdx;

		// Don't treat '> ' as part of the line's content if we're in a blockquote.
		let contentLength = line.text.length;
		if (inBlockQuote && preserveBlockQuotes) {
			contentLength -= blockQuoteStartLen;
		}

		// If it matches the entire line, remove the newline character.
		if (match[0].length === contentLength) {
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

		const startMatchLen = findInlineMatch(doc, inlineSpec, sel, MatchSide.Start);
		const stopMatchLen = findInlineMatch(doc, inlineSpec, sel, MatchSide.End);

		if (startMatchLen >= 0 && stopMatchLen >= 0) {
			const fromLine = doc.lineAt(sel.from);
			const inBlockQuote = fromLine.text.match(blockQuoteRegex);

			let lineStartStr = '\n';
			if (inBlockQuote && preserveBlockQuotes) {
				lineStartStr = '\n> ';
			}


			const inlineStart = sel.from - startMatchLen;
			const inlineStop = sel.from + stopMatchLen;

			// Determine the text that starts the new block (e.g. \n$$\n for
			// a math block).
			let blockStart = `${blockSpec.template.start}${lineStartStr}`;
			if (fromLine.from !== inlineStart) {
				// Add a line before to put the start of the block
				// on its own line.
				blockStart = lineStartStr + blockStart;
			}

			return {
				changes: [
					{
						from: inlineStart,
						to: inlineStop,
						insert: `${blockStart}${lineStartStr}${blockSpec.template.end}`,
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
		sel = growSelectionToNode(state, sel, blockSpec.nodeName);

		const fromLine = doc.lineAt(sel.from);
		const toLine = doc.lineAt(sel.to);
		let fromLineText = fromLine.text;
		let toLineText = toLine.text;

		let charsAdded = 0;
		const changes = [];

		// Single line: Inline toggle.
		if (fromLine.number === toLine.number) {
			return toggleInlineSelectionFormat(state, inlineSpec, sel);
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
		const startMatch = blockSpec.matcher.start.exec(fromLineText);
		const stopMatch = blockSpec.matcher.end.exec(toLineText);
		if (startMatch && stopMatch) {
			// Get start and stop indices for the starting and ending matches
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
				insertBefore = `> ${blockSpec.template.start}\n`;
				insertAfter = `\n> ${blockSpec.template.end}`;
			} else {
				insertBefore = `${blockSpec.template.start}\n`;
				insertAfter = `\n${blockSpec.template.end}`;
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
				fromLine.from, toLine.to + charsAdded,
			),
		};
	});

	return changes;
};

// Toggles whether all lines in the user's selection start with [regex].
export const toggleSelectedLinesStartWith = (
	state: EditorState,
	regex: RegExp,
	template: string,
	matchEmpty: boolean,

	// Name associated with what [regex] matches (e.g. FencedCode)
	nodeName?: string,
): TransactionSpec => {
	const ignoreBlockQuotes = true;
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
		let charsAddedBefore = 0;

		const changes = [];
		const lines = [];

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

// Ensures that ordered lists within [sel] are numbered in ascending order.
export const renumberSelectedLists = (state: EditorState): TransactionSpec => {
	const doc = state.doc;

	const listItemRegex = /^(\s*)(\d+)\.\s?/;

	// Re-numbers ordered lists and sublists with numbers on each line in [linesToHandle]
	const handleLines = (linesToHandle: Line[]) => {
		const changes: ChangeSpec[] = [];

		type ListItemRecord = {
			nextListNumber: number;
			indentationLength: number;
		};
		const listNumberStack: ListItemRecord[] = [];
		let currentGroupIndentation = '';
		let nextListNumber = 1;
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
