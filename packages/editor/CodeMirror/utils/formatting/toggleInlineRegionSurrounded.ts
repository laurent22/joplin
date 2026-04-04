import { Text as DocumentText, EditorSelection, SelectionRange } from '@codemirror/state';
import { RegionSpec } from './RegionSpec';
import findInlineMatch, { MatchSide } from './findInlineMatch';
import { SelectionUpdate } from './types';

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
		// When the selection is non-empty, trim leading/trailing whitespace so that
		// formatting markers are placed adjacent to the text content.
		let insertFrom = sel.from;
		let insertTo = sel.to;

		if (!sel.empty) {
			const leadingWhitespace = content.match(/^\s*/)?.[0] ?? '';
			const trailingWhitespace = content.match(/\s*$/)?.[0] ?? '';
			insertFrom += leadingWhitespace.length;
			insertTo -= trailingWhitespace.length;

			// If the entire selection is whitespace, fall back to the original range.
			if (insertFrom >= insertTo) {
				insertFrom = sel.from;
				insertTo = sel.to;
			}
		}

		changes.push({
			from: insertFrom,
			insert: spec.template.start,
		});

		changes.push({
			from: insertTo,
			insert: spec.template.end,
		});

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

export default toggleInlineRegionSurrounded;
