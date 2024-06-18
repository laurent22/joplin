import { EditorSelection, EditorState, Line, SelectionRange, TransactionSpec } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import findInlineMatch, { MatchSide } from './findInlineMatch';
import growSelectionToNode from '../growSelectionToNode';
import toggleInlineSelectionFormat from './toggleInlineSelectionFormat';

const blockQuoteStartLen = '> '.length;
const blockQuoteRegex = /^>\s/;

// Toggle formatting for all selections. For example,
// toggling a code RegionSpec repeatedly should create:
// 1. Empty inline code: ``
// 2. Empty block code:
//    ```
//    ```
// 3. Remove the block code.
//
// This is intended primarily for mobile, where characters
// like "`" can be difficult to type.
const toggleRegionFormatGlobally = (
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

export default toggleRegionFormatGlobally;

