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
//
// Leading/trailing whitespace on a non-empty selection is kept outside the
// markers (see app-desktop CodeMirror v5 wrapSelections).
const toggleInlineRegionSurrounded = (
	doc: DocumentText, sel: SelectionRange, spec: RegionSpec,
): SelectionUpdate => {
	let workSel = sel;
	if (!sel.empty) {
		const selected = doc.sliceString(sel.from, sel.to);
		const leadMatch = /^\s*/.exec(selected);
		const trailMatch = /\s*$/.exec(selected);
		const leadLen = leadMatch ? leadMatch[0].length : 0;
		const trailLen = trailMatch ? trailMatch[0].length : 0;
		const coreFrom = sel.from + leadLen;
		const coreTo = sel.to - trailLen;
		if (coreFrom >= coreTo) {
			return {
				range: sel,
				didChange: false,
			};
		}
		workSel = EditorSelection.range(coreFrom, coreTo);
	}

	let content = doc.sliceString(workSel.from, workSel.to);
	const startMatchLen = findInlineMatch(doc, spec, workSel, MatchSide.Start);
	const endMatchLen = findInlineMatch(doc, spec, workSel, MatchSide.End);

	const startsWithBefore = startMatchLen >= 0;
	const endsWithAfter = endMatchLen >= 0;

	const changes = [];
	let finalSelStart = workSel.from;
	let finalSelEnd = workSel.to;

	if (startsWithBefore && endsWithAfter) {
		// Remove the before and after.
		content = content.substring(startMatchLen);
		content = content.substring(0, content.length - endMatchLen);

		finalSelEnd -= startMatchLen + endMatchLen;

		changes.push({
			from: workSel.from,
			to: workSel.to,
			insert: content,
		});
	} else {
		changes.push({
			from: workSel.from,
			insert: spec.template.start,
		});

		changes.push({
			from: workSel.to,
			insert: spec.template.end,
		});

		// If not a caret,
		if (!sel.empty) {
			// Select the surrounding chars.
			finalSelEnd += spec.template.start.length + spec.template.end.length;
		} else {
			// Position the caret within the added content.
			finalSelStart = workSel.from + spec.template.start.length;
			finalSelEnd = finalSelStart;
		}
	}

	return {
		changes,
		range: EditorSelection.range(finalSelStart, finalSelEnd),
		didChange: true,
	};
};

export default toggleInlineRegionSurrounded;
