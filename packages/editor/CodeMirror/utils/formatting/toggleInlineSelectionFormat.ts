import { EditorSelection, SelectionRange, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { RegionSpec } from './RegionSpec';
import { SelectionUpdate } from './types';
import findInlineMatch, { MatchSide } from './findInlineMatch';
import growSelectionToNode from '../growSelectionToNode';
import toggleInlineRegionSurrounded from './toggleInlineRegionSurrounded';

const listMarkerRegex = /^(?:>\s*)*\s*(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/;

const selectionInsideFencedCode = (state: EditorState, sel: SelectionRange) => {
	let isInside = false;

	syntaxTree(state).iterate({
		from: sel.from,
		to: sel.to,
		enter: node => {
			if (node.name === 'FencedCode' && node.from <= sel.from && node.to >= sel.to) {
				isInside = true;
				return false;
			}

			return !isInside;
		},
	});

	return isInside;
};

const shouldFormatMultilineByLine = (state: EditorState, sel: SelectionRange) => {
	if (sel.empty) {
		return false;
	}

	const fromLine = state.doc.lineAt(sel.from);
	const toLine = state.doc.lineAt(sel.to);
	const isMultiline = fromLine.number !== toLine.number;
	const selectsCompleteLines = sel.from === fromLine.from && sel.to === toLine.to;

	if (!isMultiline || !selectsCompleteLines) {
		return false;
	}

	return !selectionInsideFencedCode(state, sel);
};

const toggleInlineFormatLineByLine = (
	state: EditorState, spec: RegionSpec, sel: SelectionRange,
): SelectionUpdate => {
	const doc = state.doc;
	const fromLine = doc.lineAt(sel.from);
	const toLine = doc.lineAt(sel.to);
	const changes = [];
	let selectionDelta = 0;

	for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber++) {
		const line = doc.line(lineNumber);
		if (line.text.trim() === '') {
			continue;
		}

		const listMarkerMatch = line.text.match(listMarkerRegex);
		const contentFrom = listMarkerMatch ? line.from + listMarkerMatch[0].length : line.from;
		const contentTo = line.to;

		if (contentFrom >= contentTo) {
			continue;
		}

		const lineSelection = EditorSelection.range(contentFrom, contentTo);
		const startMatchLen = findInlineMatch(doc, spec, lineSelection, MatchSide.Start);
		const endMatchLen = findInlineMatch(doc, spec, lineSelection, MatchSide.End);

		if (startMatchLen >= 0 && endMatchLen >= 0) {
			const lineContent = doc.sliceString(contentFrom, contentTo);
			const newContent = lineContent.substring(startMatchLen, lineContent.length - endMatchLen);

			changes.push({
				from: contentFrom,
				to: contentTo,
				insert: newContent,
			});
			selectionDelta -= startMatchLen + endMatchLen;
		} else {
			changes.push({ from: contentFrom, insert: spec.template.start });
			changes.push({ from: contentTo, insert: spec.template.end });
			selectionDelta += spec.template.start.length + spec.template.end.length;
		}
	}

	return {
		changes,
		range: EditorSelection.range(sel.from, sel.to + selectionDelta),
	};
};

// Returns updated selections: For all selections in the given `EditorState`, toggles
// whether each is contained in an inline region of type [spec].
const toggleInlineSelectionFormat = (
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

	if (shouldFormatMultilineByLine(state, sel)) {
		return toggleInlineFormatLineByLine(state, spec, sel);
	}

	// Grow the selection to encompass the entire node.
	const newRange = growSelectionToNode(state, sel, spec.nodeName);

	return toggleInlineRegionSurrounded(state.doc, newRange, spec);
};

export default toggleInlineSelectionFormat;
